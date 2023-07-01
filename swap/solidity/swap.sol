

import "./system_instruction.sol";
import "./spl_token.sol";
import "solana";

@program_id("SGqsu3tC2MnFc3UuvxyNdQZa6EQF4PT7SNBSZuWfkrS")
contract swap {
    address private poolAddress;
    address private mint0Address;
    address private mint1Address;

    @payer(payer) // payer address
    @seed(abi.encode(mint0)) // mint0 address (first token in the pool)
    @seed(abi.encode(mint1)) // mint1 address (second token in the pool)
    @bump(bump) // bump seed for pda address
    constructor(address payer, address pool, address mint0, address mint1, bytes bump) {
        // Create and initialize vault token accounts for the pool
        createVaultTokenAccount(payer, mint0, pool);
        createVaultTokenAccount(payer, mint1, pool);
        // Create and initialize liquidity provider mint account for the pool
        createLiquidityProviderMint(payer, pool);
        poolAddress = pool;
        mint0Address = mint0;
        mint1Address = mint1;
    }

    // Instruction to create and initialize a token account with a Program Derived Address (PDA) as the address
    function createVaultTokenAccount(address payer, address mint, address pool) internal view {
        // Derive the PDA address for the token account
        (address vaultTokenAccount, bytes1 vaultTokenAccountBump) = try_find_program_address([abi.encode(mint), abi.encode(pool)], type(swap).program_id);

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
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(pool)], type(swap).program_id);

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

    function getPoolAddress() public view returns (address) {
        return poolAddress;
    }

    function getMint0Address() public view returns (address) {
        return mint0Address;
    }

    function getMint1Address() public view returns (address) {
        return mint1Address;
    }

    // TODO: implement curve math
    function deposit(uint64 amount0, uint64 amount1, address tokenAccount0, address tokenAccount1, address owner, address liquidityProviderTokenAccount) public view {
        //  print("Value: {:}".format(test));
        address poolAddress = getPoolAddress();
        address mint0Address = getMint0Address();
        address mint1Address = getMint1Address();

        (address vault0TokenAccount, bytes1 vault0TokenAccountBump) = try_find_program_address([abi.encode(mint0Address), abi.encode(poolAddress)], type(swap).program_id);
        (address vault1TokenAccount, bytes1 vault1TokenAccountBump) = try_find_program_address([abi.encode(mint1Address), abi.encode(poolAddress)], type(swap).program_id);
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(poolAddress)], type(swap).program_id);
        print("Vault0: {:}".format(vault0TokenAccount));
        print("Vault1: {:}".format(vault1TokenAccount));
        print("LP Mint: {:}".format(liquidityProviderMint));

        SplToken.transfer(
            tokenAccount0, // source account
            vault0TokenAccount, // destination account
            owner, // owner
            amount0 // amount
        );

        SplToken.transfer(
            tokenAccount1, // source account
            vault1TokenAccount, // destination account
            owner, // owner
            amount1 // amount
        );

        // TODO: implement curve math
        mintTo(liquidityProviderTokenAccount, amount0 + amount1);
    }

    // Invoke the token program to mint tokens to a token account, using a PDA as the mint authority
    function mintTo(address account, uint64 amount) internal view {
        address mint0Address = getMint0Address();
        address mint1Address = getMint1Address();
        (address pool, bytes1 poolBump) = try_find_program_address([abi.encode(mint0Address), abi.encode(mint1Address)], type(swap).program_id);
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(pool)], type(swap).program_id);

        // Prepare instruction data
        bytes instructionData = new bytes(9);
        instructionData[0] = uint8(7); // MintTo instruction index
        instructionData.writeUint64LE(amount, 1); // Amount to mint

        // Prepare accounts required by instruction
        AccountMeta[3] metas = [
            AccountMeta({pubkey: liquidityProviderMint, is_writable: true, is_signer: false}), // mint account
            AccountMeta({pubkey: account, is_writable: true, is_signer: false}), // destination account
            AccountMeta({pubkey: pool, is_writable: true, is_signer: true}) // mint authority
        ];

        // Invoke the token program with prepared accounts and instruction data
        SplToken.tokenProgramId.call{accounts: metas, seeds: [[abi.encode(mint0Address), abi.encode(mint1Address), abi.encode(poolBump)]]}(instructionData);
    }

    // TODO: implement curve math
    // Burn liquidity tokens to withdraw tokens from the pool
    function withdraw(uint64 amount, address tokenAccount0, address tokenAccount1, address owner, address liquidityProviderTokenAccount) public view {
        address poolAddress = getPoolAddress();
        address mint0Address = getMint0Address();
        address mint1Address = getMint1Address();

        (address vault0TokenAccount, bytes1 vault0TokenAccountBump) = try_find_program_address([abi.encode(mint0Address), abi.encode(poolAddress)], type(swap).program_id);
        (address vault1TokenAccount, bytes1 vault1TokenAccountBump) = try_find_program_address([abi.encode(mint1Address), abi.encode(poolAddress)], type(swap).program_id);
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(poolAddress)], type(swap).program_id);

        // Invoke the token program to burn liquidity tokens
        SplToken.burn(
            liquidityProviderTokenAccount, // source account
            liquidityProviderMint, // destination account
            owner, // owner
            amount // amount
        );

        // TODO: implement curve math
        // Withdraw token amounts from the pool
        uint64 withdrawAmount = amount / 2;
        transfer(
            vault0TokenAccount, // destination account
            tokenAccount0, // source account
            withdrawAmount // amount
        );
        transfer(
            vault1TokenAccount, // destination account
            tokenAccount1, // source account
            withdrawAmount // amount
        );
    }

    // Invoke the token program to transfer tokens from a token account, using a PDA as the token owner
    function transfer(address from, address to, uint64 amount) internal view {
        address mint0Address = getMint0Address();
        address mint1Address = getMint1Address();
        (address pool, bytes1 poolBump) = try_find_program_address([abi.encode(mint0Address), abi.encode(mint1Address)], type(swap).program_id);


        // Prepare instruction data
        bytes instructionData = new bytes(9);
        instructionData[0] = uint8(3); // Transfer instruction index
        instructionData.writeUint64LE(amount, 1); // Amount to transfer

        // Prepare accounts required by instruction
        AccountMeta[3] metas = [
            AccountMeta({pubkey: from, is_writable: true, is_signer: false}), // source account
            AccountMeta({pubkey: to, is_writable: true, is_signer: false}), // destination account
            AccountMeta({pubkey: poolAddress, is_writable: true, is_signer: true}) // owner
        ];

        // Invoke the token program with prepared accounts and instruction data
        SplToken.tokenProgramId.call{accounts: metas, seeds: [[abi.encode(mint0Address), abi.encode(mint1Address), abi.encode(poolBump)]]}(instructionData);
    }

    function swapToken(uint64 amount, address sourceTokenAccount, address destinationTokenAccount, address user) public view {
        address poolAddress = getPoolAddress();
        address mint0Address = getMint0Address();
        address mint1Address = getMint1Address();

        (address vault0TokenAccount, bytes1 vault0TokenAccountBump) = try_find_program_address([abi.encode(mint0Address), abi.encode(poolAddress)], type(swap).program_id);
        (address vault1TokenAccount, bytes1 vault1TokenAccountBump) = try_find_program_address([abi.encode(mint1Address), abi.encode(poolAddress)], type(swap).program_id);

        // Get the token account data for the source token account
        SplToken.TokenAccountData sourceTokenAccountData = SplToken.get_token_account_data(sourceTokenAccount);

        address vaultSourceTokenAccount;
        address vaultDestinationTokenAccount;

        if (sourceTokenAccountData.mintAccount == mint0Address) {
            vaultSourceTokenAccount = vault1TokenAccount;
            vaultDestinationTokenAccount = vault0TokenAccount;
        } else {
            vaultSourceTokenAccount = vault0TokenAccount;
            vaultDestinationTokenAccount = vault1TokenAccount;
        }

        SplToken.transfer(
            sourceTokenAccount, // source account
            vaultDestinationTokenAccount, // destination account
            user, // owner
            amount // amount
        );

        // TODO: implement curve math
        transfer(
            vaultSourceTokenAccount, // source account
            destinationTokenAccount, // destination account
            amount // amount
        );
    }
}
