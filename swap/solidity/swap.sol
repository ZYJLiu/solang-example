

import "./system_instruction.sol";
import "./spl_token.sol";
import "solana";

@program_id("SGqsu3tC2MnFc3UuvxyNdQZa6EQF4PT7SNBSZuWfkrS")
contract swap {

    @payer(payer) // payer address
    @seed("pool") // hardcoded seed
    @seed(abi.encode(mint0)) // mint0 address (first token in the pool)
    @seed(abi.encode(mint1)) // mint1 address (second token in the pool)
    @bump(bump) // bump seed for pda address
    constructor(address payer, address pool, address mint0, address mint1, bytes bump) {
        // Create and initialize vault token accounts for the pool
        createVaultTokenAccount(payer, mint0, pool);
        createVaultTokenAccount(payer, mint1, pool);
        // Create and initialize liquidity provider mint account for the pool
        createLiquidityProviderMint(payer, pool);
    }

    // Instruction to create and initialize a token account with a Program Derived Address (PDA) as the address
    function createVaultTokenAccount(address payer, address mint, address pool) internal view {
        // Derive the PDA address for the token account
        (address vaultTokenAccount, bytes1 vaultTokenAccountBump) = try_find_program_address([abi.encode(mint), abi.encode(pool)], address"SGqsu3tC2MnFc3UuvxyNdQZa6EQF4PT7SNBSZuWfkrS");

        // Create new token account with the PDA as the address
        createTokenAccount(payer, vaultTokenAccount, mint, pool, vaultTokenAccountBump);

        // Initialize the newly created token account
        SplToken.initialize_account(
            vaultTokenAccount, // token account
            mint, // mint
            pool // owner (the pool account PDA is the owner of the token account)
        );
    }

    // Invoke the system program to create an account, with space for a token account
    function createTokenAccount(address payer, address newAccount, address mint, address pool, bytes bump) internal view{
        // Prepare accounts required by instruction
        AccountMeta[2] metas = [
            AccountMeta({pubkey: payer, is_signer: true, is_writable: true}),
            AccountMeta({pubkey: newAccount, is_signer: true, is_writable: true})
        ];

        // Prepare instruction data
        bytes instructionData = abi.encode(
            uint32(0), // CreateAccount instruction index
            uint64(2039280), // lamports (minimum balance required for token account)
            uint64(165), // space (minimum required for mint account)
            SplToken.tokenProgramId // owner (the account will be owned by the token program)
        );

        // Call the system program to create a new account with the prepared instruction data
        SystemInstruction.systemAddress.call{accounts: metas, seeds: [[abi.encode(mint), abi.encode(pool), bump]]}(instructionData);
    }

    // Instruction to create and initialize a mint account
    function createLiquidityProviderMint(address payer, address pool) internal view {
        // Derive the PDA address for the mint account
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(pool)], address"SGqsu3tC2MnFc3UuvxyNdQZa6EQF4PT7SNBSZuWfkrS");

        // Create new account for mint using PDA as the address
        createMintAccount(payer, liquidityProviderMint, pool, liquidityProviderMintBump);

        // // Initialize mint account
        SplToken.initialize_mint(
            liquidityProviderMint, // mint account
            pool, // mint authority (pool account PDA is the mint authority)
            pool, // freeze authority
            9 // decimals
        );
    }

    // Invoke the system program to create an account, with space for mint account
    function createMintAccount(address payer, address mint, address pool, bytes bump) internal view{
        // Prepare accounts required by instruction
        AccountMeta[2] metas = [
            AccountMeta({pubkey: payer, is_signer: true, is_writable: true}),
            AccountMeta({pubkey: mint, is_signer: true, is_writable: true})
        ];

        // Prepare instruction data
        bytes instructionData = abi.encode(
            uint32(0), // CreateAccount instruction index
            uint64(1461600), // lamports (minimum balance required for mint account)
            uint64(82), // space (minimum required for mint account)
            SplToken.tokenProgramId // owner (the account will be owned by the token program)
        );

        // Call the system program to create a new account with the prepared instruction data
        SystemInstruction.systemAddress.call{accounts: metas, seeds: [[abi.encode(pool), bump]]}(instructionData);
    }
}
