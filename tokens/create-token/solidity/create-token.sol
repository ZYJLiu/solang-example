
import "./spl_token.sol";
import "./system_instruction.sol";
import "./mpl_metadata.sol";

@program_id("8eZPhSaXfHqbcrfskVThtCG68kq8MfVHqmtm6wYf4TLb")
contract create_token {

    // Creating a dataAccount is required by Solang
    // The account is unused in this example
    @payer(payer) // payer account
    constructor(address payer) {}

    function createTokenMint(
        address payer, // payer account
        address mint, // mint account to be created
        address mintAuthority, // mint authority for the mint account
        address freezeAuthority, // freeze authority for the mint account
        address metadata, // metadata account to be created
        uint8 decimals, // decimals for the mint account
        string name, // name for the metadata account
        string symbol, // symbol for the metadata account
        string uri // uri for the metadata account
    ) public view {
        // Invoke System Program to create a new account for the mint account
        // Program owner is set to the Token program
        SystemInstruction.create_account(
            payer,   // lamports sent from this account (payer)
            mint,    // lamports sent to this account (account to be created)
            1461600, // lamport amount (minimum lamports for mint account)
            82,      // space required for the account (mint account)
            SplToken.tokenProgramId // new program owner
        );

        // Invoke Token Program to initialize the mint account
        // Set mint authority, freeze authority, and decimals for the mint account
        SplToken.initialize_mint(
            mint,            // mint account
            mintAuthority,   // mint authority
            freezeAuthority, // freeze authority
            decimals         // decimals
        );

        // Invoke Metadata Program to create a new account for the metadata account
        MplMetadata.create_metadata_account(
            metadata, // metadata account
            mint,  // mint account
            mintAuthority, // mint authority
            payer, // payer
            payer, // update authority (of the metadata account)
            name, // name
            symbol, // symbol
            uri // uri (off-chain metadata json)
        );
    }
}
