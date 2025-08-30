module oracle_arena::game {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_std::table::{Self, Table};
    use supra_addr::supra_vrf;
    use supra_addr::automation_registry;

    // Error codes
    const E_GAME_NOT_FOUND: u64 = 1;
    const E_NOT_PLAYER: u64 = 2;
    const E_GAME_FINISHED: u64 = 3;
    const E_INSUFFICIENT_STAKE: u64 = 4;
    const E_INVALID_TURN: u64 = 5;

    // Game structures
    struct Player has store, drop {
        address: address,
        health: u64,
        max_health: u64,
        attack: u64,
        defense: u64,
        staked_amount: u64,
    }

    struct BattleAction has store, drop {
        action_type: u8, // 0=attack, 1=defend, 2=special
        damage: u64,
        oracle_multiplier: u64, // scaled by 10000 for precision
        turn_number: u64,
        oracle_price_delta: u64,
    }

    struct Game has store {
        game_id: u64,
        player1: Player,
        player2: Player,
        current_turn_player: address,
        winner: address,
        is_finished: bool,
        total_stake: u64,
        battle_log: vector<BattleAction>,
        vrf_nonce: u64,
        created_at: u64,
    }

    struct OracleArenaGlobal has key {
        games: Table<u64, Game>,
        next_game_id: u64,
        admin: address,
        tournament_pool: u64,
    }

    struct PlayerStats has key {
        wins: u64,
        losses: u64,
        total_games: u64,
        total_earned: u64,
    }

    // VRF callback structure
    struct VRFRandomness has key {
        random_numbers: Table<u64, vector<u256>>,
    }

    // Initialize the module
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        move_to(admin, OracleArenaGlobal {
            games: table::new(),
            next_game_id: 1,
            admin: admin_addr,
            tournament_pool: 0,
        });

        move_to(admin, VRFRandomness {
            random_numbers: table::new(),
        });
    }

    // Create new battle with stake
    public entry fun create_battle(
        player1: &signer,
        stake_amount: u64,
    ) acquires OracleArenaGlobal {
        let player1_addr = signer::address_of(player1);
        let global = borrow_global_mut<OracleArenaGlobal>(@oracle_arena);

        // Validate stake amount
        assert!(stake_amount >= 100000000, E_INSUFFICIENT_STAKE); // Min 1 SUPRA

        let game_id = global.next_game_id;
        global.next_game_id = global.next_game_id + 1;

        let new_game = Game {
            game_id,
            player1: Player {
                address: player1_addr,
                health: 100,
                max_health: 100,
                attack: 25,
                defense: 15,
                staked_amount: stake_amount,
            },
            player2: Player {
                address: @0x0, // Will be set when player2 joins
                health: 100,
                max_health: 100,
                attack: 20,
                defense: 20,
                staked_amount: 0,
            },
            current_turn_player: player1_addr,
            winner: @0x0,
            is_finished: false,
            total_stake: stake_amount,
            battle_log: vector::empty(),
            vrf_nonce: 0,
            created_at: 0, // Should use timestamp
        };

        table::add(&mut global.games, game_id, new_game);
    }

    // Join existing battle
    public entry fun join_battle(
        player2: &signer,
        game_id: u64,
        stake_amount: u64,
    ) acquires OracleArenaGlobal {
        let player2_addr = signer::address_of(player2);
        let global = borrow_global_mut<OracleArenaGlobal>(@oracle_arena);

        assert!(table::contains(&global.games, game_id), E_GAME_NOT_FOUND);
        let game = table::borrow_mut(&mut global.games, game_id);

        // Validate stake matches player1
        assert!(stake_amount == game.player1.staked_amount, E_INSUFFICIENT_STAKE);

        game.player2.address = player2_addr;
        game.player2.staked_amount = stake_amount;
        game.total_stake = game.total_stake + stake_amount;
    }

    // Execute battle action with oracle price integration
    public entry fun battle_action(
        player: &signer,
        game_id: u64,
        action_type: u8,
        oracle_price_delta: u64, // Price delta * 10000 for precision
    ) acquires OracleArenaGlobal, VRFRandomness {
        let player_addr = signer::address_of(player);
        let global = borrow_global_mut<OracleArenaGlobal>(@oracle_arena);
        let vrf_data = borrow_global_mut<VRFRandomness>(@oracle_arena);

        assert!(table::contains(&global.games, game_id), E_GAME_NOT_FOUND);
        let game = table::borrow_mut(&mut global.games, game_id);

        assert!(!game.is_finished, E_GAME_FINISHED);
        assert!(game.current_turn_player == player_addr, E_INVALID_TURN);

        // Calculate oracle multiplier from price delta
        let oracle_multiplier = calculate_oracle_multiplier(oracle_price_delta);

        // Execute action based on type
        let damage = if (action_type == 0) { // Attack
            execute_attack(game, player_addr, oracle_multiplier)
        } else if (action_type == 1) { // Defend
            execute_defend(game, player_addr, oracle_multiplier)
        } else { // Special attack
            execute_special_attack(game, player_addr, oracle_multiplier)
        };

        // Log the action
        let action = BattleAction {
            action_type,
            damage,
            oracle_multiplier,
            turn_number: vector::length(&game.battle_log) + 1,
            oracle_price_delta,
        };
        vector::push_back(&mut game.battle_log, action);

        // Check for game end
        if (game.player1.health == 0) {
            game.winner = game.player2.address;
            game.is_finished = true;
        } else if (game.player2.health == 0) {
            game.winner = game.player1.address;
            game.is_finished = true;
        } else {
            // Switch turns
            game.current_turn_player = if (game.current_turn_player == game.player1.address) {
                game.player2.address
            } else {
                game.player1.address
            };
        }
    }

    // VRF loot box implementation
    public entry fun open_loot_box(
        player: &signer,
        rng_count: u8,
        client_seed: u64,
        num_confirmations: u64,
    ) {
        let callback_address = @oracle_arena;
        let callback_module = string::utf8(b"game");
        let callback_function = string::utf8(b"loot_box_callback");

        let _nonce = supra_vrf::rng_request(
            player,
            callback_address,
            callback_module,
            callback_function,
            rng_count,
            client_seed,
            num_confirmations
        );
    }

    // VRF callback for loot box
    public entry fun loot_box_callback(
        nonce: u64,
        message: vector<u8>,
        signature: vector<u8>,
        caller_address: address,
        rng_count: u8,
        client_seed: u64,
    ) acquires VRFRandomness {
        let verified_nums = supra_vrf::verify_callback(
            nonce,
            message,
            signature,
            caller_address,
            rng_count,
            client_seed
        );

        let vrf_data = borrow_global_mut<VRFRandomness>(@oracle_arena);
        table::add(&mut vrf_data.random_numbers, nonce, verified_nums);
    }

    // Automation: Schedule daily tournament
    public entry fun schedule_tournament(
        admin: &signer,
        prize_pool: u64,
        max_gas_amount: u64,
        gas_price_cap: u64,
        automation_fee_cap: u64,
        expiry_time: u64,
    ) {
        let admin_addr = signer::address_of(admin);

        // Register automation task for daily tournament
        // This would integrate with Supra's automation registry
        // Implementation would depend on the specific automation API
    }

    // Helper functions
    fun calculate_oracle_multiplier(price_delta: u64): u64 {
        // Convert price delta to damage multiplier
        // Positive delta increases damage, negative delta decreases
        if (price_delta > 10000) { // > 0% change
            10000 + (price_delta - 10000) / 2 // 50% of price increase
        } else {
            10000 - (10000 - price_delta) / 4 // 25% of price decrease
        }
    }

    fun execute_attack(game: &mut Game, attacker: address, multiplier: u64): u64 {
        let (attacker_stats, defender_stats) = if (attacker == game.player1.address) {
            (&game.player1, &mut game.player2)
        } else {
            (&game.player2, &mut game.player1)
        };

        let base_damage = attacker_stats.attack;
        let modified_damage = (base_damage * multiplier) / 10000;
        let final_damage = if (modified_damage > defender_stats.defense) {
            modified_damage - defender_stats.defense
        } else {
            1 // Minimum damage
        };

        if (defender_stats.health > final_damage) {
            defender_stats.health = defender_stats.health - final_damage;
        } else {
            defender_stats.health = 0;
        };

        final_damage
    }

    fun execute_defend(game: &mut Game, _defender: address, _multiplier: u64): u64 {
        // Defend action - no damage, but might reduce incoming damage next turn
        0
    }

    fun execute_special_attack(game: &mut Game, attacker: address, multiplier: u64): u64 {
        let (attacker_stats, defender_stats) = if (attacker == game.player1.address) {
            (&game.player1, &mut game.player2)
        } else {
            (&game.player2, &mut game.player1)
        };

        let base_damage = attacker_stats.attack * 2; // Special attack does 2x damage
        let modified_damage = (base_damage * multiplier) / 10000;
        let final_damage = modified_damage; // Special attacks ignore defense

        if (defender_stats.health > final_damage) {
            defender_stats.health = defender_stats.health - final_damage;
        } else {
            defender_stats.health = 0;
        };

        final_damage
    }

    // View functions
    #[view]
    public fun get_game(game_id: u64): Game acquires OracleArenaGlobal {
        let global = borrow_global<OracleArenaGlobal>(@oracle_arena);
        *table::borrow(&global.games, game_id)
    }

    #[view]
    public fun get_vrf_result(nonce: u64): vector<u256> acquires VRFRandomness {
        let vrf_data = borrow_global<VRFRandomness>(@oracle_arena);
        *table::borrow(&vrf_data.random_numbers, nonce)
    }
}