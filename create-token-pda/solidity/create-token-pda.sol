
import "../utils/system_instruction.sol";
import "../utils/spl_token.sol";
import "solana";

@program_id("Fi1fHVT53eF5u6EZftV5yj6nsBmDvVJrcRM1GCGJCraW")
contract create_token_pda {

    @payer(payer)
    constructor(address payer) {}


    function initializeMint(address payer, address mint, address mintAuthority, address freezeAuthority, uint8 decimals, bytes bump) public view {
        // PDA check
        checkMintPDA(mint, bump);

        // Create new account for mint using PDA as the address
        createMintAccount(payer, mint, bump);

        // Initialize mint account
        SplToken.initialize_mint(mint, mintAuthority, freezeAuthority, decimals);
    }

    // Invoke the system program to create an account, with space for mint account
    function createMintAccount(address payer, address newAccount, bytes bump) internal view{
        AccountMeta[2] metas = [
            AccountMeta({pubkey: payer,  is_signer: true, is_writable: true}),
            AccountMeta({pubkey: newAccount, is_signer: true, is_writable: true})
        ];

        bytes instructionData = abi.encode(
            uint32(0), // CreateAccount instruction index
            uint64(1461600), // lamports
            uint64(82), // space
            SplToken.tokenProgramId // owner, transfer ownership to token program
        );

        SystemInstruction.systemAddress.call{accounts: metas, seeds: [["mint", bump]]}(instructionData);
    }

    // Create a token account using a PDA as the address
    function initializeAccount(address payer, address tokenAccount, address mint, bytes bump) public view {
        // PDA check
        checkTokenPDA(tokenAccount, bump, payer);

        createTokenAccount(payer, tokenAccount, bump);
        SplToken.initialize_account(
            tokenAccount, // token account
            mint, // mint
            tokenAccount // owner (pda)
        );
    }

    // Invoke the system program to create an account, with space for token account
    function createTokenAccount(address payer, address newAccount, bytes bump) internal view{
        AccountMeta[2] metas = [
            AccountMeta({pubkey: payer, is_signer: true, is_writable: true}),
            AccountMeta({pubkey: newAccount, is_signer: true, is_writable: true})
        ];

        bytes bincode = abi.encode(
            uint32(0), // CreateAccount instruction index
            uint64(2039280), // lamports
            uint64(165), // space
            SplToken.tokenProgramId // owner, transfer ownership to token program
        );

        SystemInstruction.systemAddress.call{accounts: metas, seeds: [["token", abi.encode(payer), bump]]}(bincode);
    }

    // Mint tokens to a token account using a PDA mint authority
    function mintTokens(address mint, address account, uint64 amount, bytes bump) public view {
        // // PDA check
        checkMintPDA(mint, bump);

        // Get mint account data to adjust amount for decimals
        SplToken.MintAccountData data = SplToken.get_mint_account_data(mint);
        mintTo(mint, account, mint, amount * 10 ** data.decimals, bump);
    }

    // Invoke the token program to mint tokens to a token account, using a PDA as the mint authority
    function mintTo(address mint, address account, address authority, uint64 amount, bytes bump) internal view {
		bytes instr = new bytes(9);
		instr[0] = uint8(7);
		instr.writeUint64LE(amount, 1);

		AccountMeta[3] metas = [
			AccountMeta({pubkey: mint, is_writable: true, is_signer: false}),
			AccountMeta({pubkey: account, is_writable: true, is_signer: false}),
			AccountMeta({pubkey: authority, is_writable: true, is_signer: true})
		];

		SplToken.tokenProgramId.call{accounts: metas, seeds: [["mint", bump]]}(instr);
	}

    // Transfer tokens from token account using a PDA as token owner
    function transferTokens(address payer, address from, address to, uint64 amount, bytes bump) public view {
        // PDA check
        checkTokenPDA(from, bump, payer);

        SplToken.TokenAccountData from_data = SplToken.get_token_account_data(from);
        SplToken.MintAccountData data = SplToken.get_mint_account_data(from_data.mintAccount);
        transfer(payer, from, to, from_data.owner, amount * 10 ** data.decimals, bump);
    }

    // Invoke the token program to transfer tokens from a token account, using a PDA as the token owner
    function transfer(address payer, address from, address to, address owner, uint64 amount, bytes bump) internal view {
		bytes instr = new bytes(9);

		instr[0] = uint8(3);
		instr.writeUint64LE(amount, 1);

		AccountMeta[3] metas = [
			AccountMeta({pubkey: from, is_writable: true, is_signer: false}),
			AccountMeta({pubkey: to, is_writable: true, is_signer: false}),
			AccountMeta({pubkey: owner, is_writable: true, is_signer: true})
		];

		SplToken.tokenProgramId.call{accounts: metas, seeds: [["token", abi.encode(payer), bump]]}(instr);
	}

    // Check that the mint PDA is the expected PDA
    function checkMintPDA(address pdaExpected, bytes1 bumpExpected) private pure {
        (address pda, bytes1 pdaBump) = try_find_program_address(["mint"], address"Fi1fHVT53eF5u6EZftV5yj6nsBmDvVJrcRM1GCGJCraW");
        require(pda == pdaExpected, "Mismatched PDA");
        require(pdaBump == bumpExpected, "Mismatched Bump");
    }

    // Check that the token account PDA is the expected PDA
    function checkTokenPDA(address pdaExpected, bytes1 bumpExpected, address seed) private pure {
        (address pda, bytes1 pdaBump) = try_find_program_address(["token", abi.encode(seed)], address"Fi1fHVT53eF5u6EZftV5yj6nsBmDvVJrcRM1GCGJCraW");
        require(pda == pdaExpected, "Mismatched PDA");
        require(pdaBump == bumpExpected, "Mismatched Bump");
    }

}
