import "./system_instruction.sol";
import "./spl_token.sol";
import "solana";
import "./Math.sol";

@program_id("8z3qb8ybfdjDtJfhxzjpk43dCxCCPUjHEmknXyr7ShwS")
contract amm {
    address private pool;
    address private mintA;
    address private mintB;

    @payer(payer) // payer address
    @seed(abi.encode(_mintA)) // mintA address (first token in the pool)
    @seed(abi.encode(_mintB)) // mintB address (second token in the pool)
    @bump(bump) // bump seed for pda address
    constructor(address payer, address _pool, address _mintA, address _mintB, bytes bump) {
        // Create and initialize reserve token accounts for the pool
        // Reserve token accounts are used to store the tokens that are deposited into the pool
        createReserveTokenAccount(payer, _mintA, _pool);
        createReserveTokenAccount(payer, _mintB, _pool);
        // Create and initialize liquidity provider mint account for the pool
        // Liquidity provider mint account is used to mint LP tokens for liquidity providers
        createLiquidityProviderMint(payer, _pool);
        pool = _pool;
        mintA = _mintA;
        mintB = _mintB;
    }

    // Get the pool address
    function getPool() public view returns (address) {
        return pool;
    }

    // Get the mint address for token A
    function getMintA() public view returns (address) {
        return mintA;
    }

    // Get the mint address for token B
    function getMintB() public view returns (address) {
        return mintB;
    }

    // Instruction to create and initialize a token account with a Program Derived Address (PDA) as the address
    function createReserveTokenAccount(address payer, address mint, address pool) internal view {
        // Derive the PDA address for the token account
        (address reserveTokenAccountAddress, bytes1 reserveTokenAccountAddressBump) = try_find_program_address([abi.encode(mint), abi.encode(pool)], type(amm).program_id);

        // Create new token account with the PDA as the address
        createTokenAccount(payer, reserveTokenAccountAddress, mint, pool, reserveTokenAccountAddressBump);

        // Initialize the newly created token account
        SplToken.initialize_account(
            reserveTokenAccountAddress, // token account to initialize
            mint, // mint
            pool // owner (the pool account PDA is the owner of the token account)
        );
    }

    // Invoke the system program to create an account, with space for a token account
    function createTokenAccount(address payer, address tokenAccountAddress, address mint, address pool, bytes bump) internal view{
        // Prepare accounts required by instruction
        AccountMeta[2] metas = [
            AccountMeta({pubkey: payer, is_signer: true, is_writable: true}),
            AccountMeta({pubkey: tokenAccountAddress, is_signer: true, is_writable: true})
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
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(pool)], type(amm).program_id);

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
    function createMintAccount(address payer, address mintAddress, address pool, bytes bump) internal view{
        // Prepare accounts required by instruction
        AccountMeta[2] metas = [
            AccountMeta({pubkey: payer, is_signer: true, is_writable: true}),
            AccountMeta({pubkey: mintAddress, is_signer: true, is_writable: true})
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

    // Deposit tokens into the pool and receive LP tokens in exchange
    function addLiquidity(uint64 amountADesired, uint64 amountBDesired, uint64 amountAMin, uint64 amountBMin, address tokenAccountA, address tokenAccountB, address owner, address liquidityProviderTokenAccount) public view {
        address pool = getPool();
        address mintA = getMintA();
        address mintB = getMintB();

        // Derive the PDA address for the reserve token accounts and liquidity provider mint account
        (address reserveATokenAccount, bytes1 reserveATokenAccountBump) = try_find_program_address([abi.encode(mintA), abi.encode(pool)], type(amm).program_id);
        (address reserveBTokenAccount, bytes1 reserveBTokenAccountBump) = try_find_program_address([abi.encode(mintB), abi.encode(pool)], type(amm).program_id);
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(pool)], type(amm).program_id);

        // Get the token account data for the reserve token accounts
        SplToken.TokenAccountData reserveATokenAccountData = SplToken.get_token_account_data(reserveATokenAccount);
        SplToken.TokenAccountData reserveBTokenAccountData = SplToken.get_token_account_data(reserveBTokenAccount);

        // Balance of reserve tokens
        uint64 reserveA = reserveATokenAccountData.balance;
        uint64 reserveB = reserveBTokenAccountData.balance;
        // Total supply of LP tokens
        uint64 totalSupply = SplToken.total_supply(liquidityProviderMint);

        // Amount of LP tokens to mint (to be calculated)
        uint64 liquidity;

        // Amount of reserve tokens to deposit (to be calculated)
        uint64 amountA;
        uint64 amountB;

        // Calculate amount of LP tokens to mint, (MINIMUM_LIQUIDITY to permanently lock small amount the first liquidity not implemented)
        // Reference: https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol#L119-L124
        // Reference: https://github.com/Uniswap/v2-periphery/blob/master/contracts/UniswapV2Router02.sol#L49-L57
        if (totalSupply == 0) {
            print("Deposit Initial Liquidity");
            amountA = amountADesired;
            amountB = amountBDesired;
            liquidity = uint64(Math.sqrt(amountADesired * amountBDesired));
        } else {
            print("Deposit Additional Liquidity");
            uint64 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, 'INSUFFICIENT_B_AMOUNT');
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint64 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, 'INSUFFICIENT_A_AMOUNT');
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
            liquidity = uint64(Math.min(amountA * totalSupply / reserveA, amountB * totalSupply / reserveB));
        }

        // Mint LP tokens to token account
        mintTo(liquidityProviderTokenAccount, liquidity);

        // Transfer tokens from owner to vault
        SplToken.transfer(
            tokenAccountA, // source account
            reserveATokenAccount, // destination account
            owner, // owner
            amountA // amount
        );

        // Transfer tokens from owner to vault
        SplToken.transfer(
            tokenAccountB, // source account
            reserveBTokenAccount, // destination account
            owner, // owner
            amountB // amount
        );

        // Print amounts to Program logs for reference
        print("Reserve A Amount: {:}".format(reserveA));
        print("Reserve B Amount: {:}".format(reserveB));
        print("LP Mint Supply: {:}".format(totalSupply));

        print("Amount A Desired: {:}".format(amountADesired));
        print("Amount B Desired: {:}".format(amountBDesired));
        print("Amount A Min: {:}".format(amountAMin));
        print("Amount B Min: {:}".format(amountBMin));

        print("Amount A Deposited: {:}".format(amountA));
        print("Amount B Deposited: {:}".format(amountB));
        print("LP Tokens Minted: {:}".format(liquidity));
    }

    // Invoke the token program to mint tokens to a token account, using a PDA as the mint authority
    function mintTo(address account, uint64 amount) internal view {
        address mintA = getMintA();
        address mintB = getMintB();

        // Derive the PDA address for the swap pool and liquidity provider mint account
        (address pool, bytes1 poolBump) = try_find_program_address([abi.encode(mintA), abi.encode(mintB)], type(amm).program_id);
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(pool)], type(amm).program_id);

        // Prepare accounts required by instruction
        AccountMeta[3] metas = [
            AccountMeta({pubkey: liquidityProviderMint, is_writable: true, is_signer: false}), // mint account
            AccountMeta({pubkey: account, is_writable: true, is_signer: false}), // destination account
            AccountMeta({pubkey: pool, is_writable: true, is_signer: true}) // mint authority
        ];

        // Prepare instruction data
        bytes instructionData = new bytes(9);
        instructionData[0] = uint8(7); // MintTo instruction index
        instructionData.writeUint64LE(amount, 1); // Amount to mint

        // Invoke the token program with prepared accounts and instruction data
        SplToken.tokenProgramId.call{accounts: metas, seeds: [[abi.encode(mintA), abi.encode(mintB), abi.encode(poolBump)]]}(instructionData);
    }

    // Burn LP tokens to withdraw tokens from the pool
    function removeLiquidity(uint64 amountBurn, address tokenAccountA, address tokenAccountB, address owner, address liquidityProviderTokenAccount) public view {
        address pool = getPool();
        address mintA = getMintA();
        address mintB = getMintB();

        (address reserveATokenAccount, bytes1 reserveATokenAccountBump) = try_find_program_address([abi.encode(mintA), abi.encode(pool)], type(amm).program_id);
        (address reserveBTokenAccount, bytes1 reserveBTokenAccountBump) = try_find_program_address([abi.encode(mintB), abi.encode(pool)], type(amm).program_id);
        (address liquidityProviderMint, bytes1 liquidityProviderMintBump) = try_find_program_address([abi.encode(pool)], type(amm).program_id);

        SplToken.TokenAccountData reserveATokenAccountData = SplToken.get_token_account_data(reserveATokenAccount);
        SplToken.TokenAccountData reserveBTokenAccountData = SplToken.get_token_account_data(reserveBTokenAccount);

        uint64 reserveA = reserveATokenAccountData.balance;
        uint64 reserveB = reserveBTokenAccountData.balance;
        uint64 totalSupply = SplToken.total_supply(liquidityProviderMint);
        print("Reserve A Amount: {:}".format(reserveA));
        print("Reserve B Amount: {:}".format(reserveB));
        print("LP Mint Supply: {:}".format(totalSupply));

        // Calculate amount of tokens to withdraw from vaults
        uint64 amountA = amountBurn * reserveA / totalSupply;
        uint64 amountB = amountBurn * reserveB / totalSupply;
        print("Withdraw Amount MintA: {:}".format(amountA));
        print("Withdraw Amount MintB: {:}".format(amountB));

        // Invoke the token program to burn liquidity tokens
        SplToken.burn(
            liquidityProviderTokenAccount, // source account
            liquidityProviderMint, // destination account
            owner, // owner
            amountBurn // amount
        );

        // Withdraw token from vault to liquidity provider
        transfer(
            reserveATokenAccount, // source account
            tokenAccountA, // destination account
            amountA // amount
        );

        // Withdraw token from vault to liquidity provider
        transfer(
            reserveBTokenAccount, // source account
            tokenAccountB, // destination account
            amountB // amount
        );
    }

    // Invoke the token program to transfer tokens from a token account, using a PDA as the token owner
    function transfer(address from, address to, uint64 amount) internal view {
        address mintA = getMintA();
        address mintB = getMintB();
        (address pool, bytes1 poolBump) = try_find_program_address([abi.encode(mintA), abi.encode(mintB)], type(amm).program_id);

        // Prepare accounts required by instruction
        AccountMeta[3] metas = [
            AccountMeta({pubkey: from, is_writable: true, is_signer: false}), // source account
            AccountMeta({pubkey: to, is_writable: true, is_signer: false}), // destination account
            AccountMeta({pubkey: pool, is_writable: true, is_signer: true}) // owner
        ];

        // Prepare instruction data
        bytes instructionData = new bytes(9);
        instructionData[0] = uint8(3); // Transfer instruction index
        instructionData.writeUint64LE(amount, 1); // Amount to transfer

        // Invoke the token program with prepared accounts and instruction data
        SplToken.tokenProgramId.call{accounts: metas, seeds: [[abi.encode(mintA), abi.encode(mintB), abi.encode(poolBump)]]}(instructionData);
    }

    // Swap tokens in the pool
    function swap(uint64 amountIn, address sourceTokenAccount, address destinationTokenAccount, address user) public view {
        address pool = getPool();
        address mintA = getMintA();
        address mintB = getMintB();

        // Derive the PDA address for reserve token accounts
        (address reserveATokenAccount, bytes1 reserveATokenAccountBump) = try_find_program_address([abi.encode(mintA), abi.encode(pool)], type(amm).program_id);
        (address reserveBTokenAccount, bytes1 reserveBTokenAccountBump) = try_find_program_address([abi.encode(mintB), abi.encode(pool)], type(amm).program_id);

        address reserveInTokenAccount; // token the user is providing to the pool (depositing to)
        address reserveOutTokenAccount; // token the user is receiving from the pool (withdrawing from)

        // Get the token account data for the source token account
        SplToken.TokenAccountData sourceTokenAccountData = SplToken.get_token_account_data(sourceTokenAccount);

        // Determine which token accounts to swap between based on the source token account
        if (sourceTokenAccountData.mintAccount == mintA) {
            reserveInTokenAccount = reserveATokenAccount;
            reserveOutTokenAccount = reserveBTokenAccount;
        } else {
            reserveInTokenAccount = reserveBTokenAccount;
            reserveOutTokenAccount = reserveATokenAccount;
        }

        // Get the token account data for the reserve token accounts
        SplToken.TokenAccountData reserveInTokenAccountData = SplToken.get_token_account_data(reserveInTokenAccount);
        SplToken.TokenAccountData reserveOutTokenAccountData = SplToken.get_token_account_data(reserveOutTokenAccount);

        // Get the current reserve balances
        uint64 reserveIn = reserveInTokenAccountData.balance;
        uint64 reserveOut = reserveOutTokenAccountData.balance;

        // Transfer tokens from the user's token account to the reserve token account
        // This is the token the user is providing to the pool
        SplToken.transfer(
            sourceTokenAccount, // source account
            reserveInTokenAccount, // destination account
            user, // owner
            amountIn // amount
        );

        // Calculate the amount of tokens the user will receive from the pool
        uint64 amountOut = getAmountOut(amountIn, reserveIn, reserveOut);

        // Transfer tokens from the vault token account to the user's token account
        // This is the token the user is receiving from the pool
        transfer(
            reserveOutTokenAccount, // source account
            destinationTokenAccount, // destination account
            amountOut // amount
        );

        print("Reserve In: {:}".format(reserveIn));
        print("Reserve Out: {:}".format(reserveOut));

        print("Amount In: {:}".format(amountIn));
        print("Amount Out: {:}".format(amountOut));
    }

    // Given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    // Reference: https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol#L35-L40
    function quote(uint64 amountA, uint64 reserveA, uint64 reserveB) internal pure returns (uint64 amountB) {
        require(amountA > 0, 'INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'INSUFFICIENT_LIQUIDITY');
        amountB = (amountA * reserveB) / reserveA;
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
