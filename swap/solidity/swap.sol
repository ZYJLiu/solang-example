

import "./system_instruction.sol";
import "./spl_token.sol";
import "solana";
import "./Math.sol";

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

    function getPoolAddress() public view returns (address) {
        return poolAddress;
    }

    function getMint0Address() public view returns (address) {
        return mint0Address;
    }

    function getMint1Address() public view returns (address) {
        return mint1Address;
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

    function deposit(uint64 amount0, uint64 amount1, address tokenAccount0, address tokenAccount1, address owner, address liquidityProviderTokenAccount) public view {
        address poolAddress = getPoolAddress();
        address mint0Address = getMint0Address();
        address mint1Address = getMint1Address();

        (address vault0TokenAccount, bytes1 vault0TokenAccountBump) = try_find_program_address([abi.encode(mint0Address), abi.encode(poolAddress)], type(swap).program_id);
        (address vault1TokenAccount, bytes1 vault1TokenAccountBump) = try_find_program_address([abi.encode(mint1Address), abi.encode(poolAddress)], type(swap).program_id);
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(poolAddress)], type(swap).program_id);
        print("Vault0: {:}".format(vault0TokenAccount));
        print("Vault1: {:}".format(vault1TokenAccount));
        print("LP Mint: {:}".format(liquidityProviderMint));

        SplToken.TokenAccountData vault0TokenAccountData = SplToken.get_token_account_data(vault0TokenAccount);
        SplToken.TokenAccountData vault1TokenAccountData = SplToken.get_token_account_data(vault1TokenAccount);

        // Amount of LP tokens to mint
        uint64 liquidity;
        uint64 _reserve0 = vault0TokenAccountData.balance;
        uint64 _reserve1 = vault1TokenAccountData.balance;
        uint64 _totalSupply = SplToken.total_supply(liquidityProviderMint);
        print("Vault0 Amount: {:}".format(_reserve0));
        print("Vault1 Amount: {:}".format(_reserve1));
        print("LP Mint Supply: {:}".format(_totalSupply));

        // Calculate amount of LP tokens to mint, MINIMUM_LIQUIDITY not included
        // TODO: check if this is correct
        if (_totalSupply == 0) {
            liquidity = uint64(Math.sqrt(amount0 * amount1));
        } else {
            liquidity = uint64(Math.min(amount0 * _totalSupply / _reserve0, amount1 * _totalSupply / _reserve1));
        }

        // Mint LP tokens to token account
        mintTo(liquidityProviderTokenAccount, liquidity);
        print("LP Tokens Minted: {:}".format(liquidity));

        // Transfer tokens from owner to vault
        SplToken.transfer(
            tokenAccount0, // source account
            vault0TokenAccount, // destination account
            owner, // owner
            amount0 // amount
        );

        // Transfer tokens from owner to vault
        SplToken.transfer(
            tokenAccount1, // source account
            vault1TokenAccount, // destination account
            owner, // owner
            amount1 // amount
        );
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
    function withdraw(uint64 amountBurn, address tokenAccount0, address tokenAccount1, address owner, address liquidityProviderTokenAccount) public view {
        address poolAddress = getPoolAddress();
        address mint0Address = getMint0Address();
        address mint1Address = getMint1Address();

        (address vault0TokenAccount, bytes1 vault0TokenAccountBump) = try_find_program_address([abi.encode(mint0Address), abi.encode(poolAddress)], type(swap).program_id);
        (address vault1TokenAccount, bytes1 vault1TokenAccountBump) = try_find_program_address([abi.encode(mint1Address), abi.encode(poolAddress)], type(swap).program_id);
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(poolAddress)], type(swap).program_id);

        SplToken.TokenAccountData vault0TokenAccountData = SplToken.get_token_account_data(vault0TokenAccount);
        SplToken.TokenAccountData vault1TokenAccountData = SplToken.get_token_account_data(vault1TokenAccount);

        uint64 balance0 = vault0TokenAccountData.balance;
        uint64 balance1 = vault1TokenAccountData.balance;
        uint64 _totalSupply = SplToken.total_supply(liquidityProviderMint);
        print("Vault0 Amount: {:}".format(balance0));
        print("Vault1 Amount: {:}".format(balance1));
        print("LP Mint Supply: {:}".format(_totalSupply));

        // Calculate amount of tokens to withdraw from vaults
        uint64 amount0 = amountBurn * balance0 / _totalSupply;
        uint64 amount1 = amountBurn * balance1 / _totalSupply;
        print("Withdraw Amount Mint0: {:}".format(amount0));
        print("Withdraw Amount Mint1: {:}".format(amount1));

        // Invoke the token program to burn liquidity tokens
        SplToken.burn(
            liquidityProviderTokenAccount, // source account
            liquidityProviderMint, // destination account
            owner, // owner
            amountBurn // amount
        );

        transfer(
            vault0TokenAccount, // destination account
            tokenAccount0, // source account
            amount0 // amount
        );
        transfer(
            vault1TokenAccount, // destination account
            tokenAccount1, // source account
            amount1 // amount
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

    // Swap tokens in the pool
    function swapToken(uint64 amountIn, address sourceTokenAccount, address destinationTokenAccount, address user) public view {
        address poolAddress = getPoolAddress();
        address mint0Address = getMint0Address();
        address mint1Address = getMint1Address();

        (address vault0TokenAccount, bytes1 vault0TokenAccountBump) = try_find_program_address([abi.encode(mint0Address), abi.encode(poolAddress)], type(swap).program_id);
        (address vault1TokenAccount, bytes1 vault1TokenAccountBump) = try_find_program_address([abi.encode(mint1Address), abi.encode(poolAddress)], type(swap).program_id);

        address reserveInTokenAccount;
        address reserveOutTokenAccount;

        // Get the token account data for the source token account
        SplToken.TokenAccountData sourceTokenAccountData = SplToken.get_token_account_data(sourceTokenAccount);

        // Determine vaults to swap between based on the source token account
        // reserveIn is the token the user is providing to the pool
        // reserveOut is the token the user is receiving from the pool
        if (sourceTokenAccountData.mintAccount == mint0Address) {
            reserveInTokenAccount = vault0TokenAccount;
            reserveOutTokenAccount = vault1TokenAccount;
        } else {
            reserveInTokenAccount = vault1TokenAccount;
            reserveOutTokenAccount = vault0TokenAccount;
        }

        // Get the token account data for the vault token accounts
        SplToken.TokenAccountData reserveInTokenAccountData = SplToken.get_token_account_data(reserveInTokenAccount);
        SplToken.TokenAccountData reserveOutTokenAccountData = SplToken.get_token_account_data(reserveOutTokenAccount);
        uint64 reserveIn = reserveInTokenAccountData.balance;
        uint64 reserveOut = reserveOutTokenAccountData.balance;
        print("Reserve In: {:}".format(reserveIn));
        print("Reserve Out: {:}".format(reserveOut));

        // Transfer tokens from the user's token account to the vault token account
        // This is the token the user is providing to the pool
        SplToken.transfer(
            sourceTokenAccount, // source account
            reserveInTokenAccount, // destination account
            user, // owner
            amountIn // amount
        );

        // Calculate the amount of tokens the user will receive from the pool
        uint64 amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        print("Amount In: {:}".format(amountIn));
        print("Amount Out: {:}".format(amountOut));

        // Transfer tokens from the vault token account to the user's token account
        // This is the token the user is receiving from the pool
        transfer(
            reserveOutTokenAccount, // source account
            destinationTokenAccount, // destination account
            amountOut // amount
        );
    }

    // Calculate the amount of tokens the user will receive from the pool
    // Reference: https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol#L43
    function getAmountOut(uint64 amountIn, uint64 reserveIn, uint64 reserveOut) internal pure returns (uint64 amountOut) {
        require(amountIn > 0, 'INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'INSUFFICIENT_LIQUIDITY');
        uint64 amountInWithFee = amountIn * 997; // 0.3% fee
        uint64 numerator = amountInWithFee * reserveOut;
        uint64 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }
}
