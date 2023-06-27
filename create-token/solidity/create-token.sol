
import "../utils/spl_token.sol";
import "../utils/system_instruction.sol";

@program_id("4B3Gh4ft9K4P7Df6ebEggAZTE4bGg52EyzDGjxES85gf")
contract create_token {

    // It appears creating a dataAccount is required, even if it's not used.
    // The dataAccount is a required account for all instructions.
    @payer(payer)
    constructor(address payer) {}

    function initializeMint(address payer, address mint, address mintAuthority, address freezeAuthority, uint8 decimals) public view {
        // Invoke System Program to create a new account for the mint account
        // Program owner is set to the Token program
        SystemInstruction.create_account(
            payer,   // lamports sent from this account (payer)
            mint,    // lamports sent to this account (account to be created)
            1461600, // lamport amount (minimum lamports for mint account)
            82,      // space required for the account (mint account)
            address"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" // new program owner
        );

        // Invoke Token Program to initialize the mint account
        // Set mint authority, freeze authority, and decimals for the mint account
        SplToken.initialize_mint(
            mint,            // mint account
            mintAuthority,   // mint authority
            freezeAuthority, // freeze authority
            decimals         // decimals
        );
    }

    function initializeAccount(address payer, address tokenAccount, address mint, address owner) public view {
        // Invoke System Program to create a new account for the token account
        // Program owner is set to the Token program
        SystemInstruction.create_account(
            payer,        // lamports sent from this account (payer)
            tokenAccount, // lamports sent to this account (account to be created)
            2039280,      // lamport amount (minimum lamports for token account)
            165,          // space required for the account (token account)
            address"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" // new program owner
        );

        // Invoke Token Program to initialize the token account
        // Specify mint and owner of the token account (not program owner)
        SplToken.initialize_account(
            tokenAccount,
            mint,
            owner
        );
    }
}
