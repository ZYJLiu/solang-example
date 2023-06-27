
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
            tokenAccount, // token account to initialize
            mint,         // mint account for the token
            owner         // owner of the token account
        );
    }

    function mintTokens(address mint, address account, address authority, uint64 amount) public view {
        // Get mint account data to adjust amount for decimals
        SplToken.MintAccountData data = SplToken.get_mint_account_data(mint);
        // Invoke Token Program to mint tokens to the token account
        SplToken.mint_to(
            mint,      // mint account
            account,   // token account
            authority, // mint authority
            amount * (10 ** uint64(data.decimals)) // adjust amount for decimals of mint account
        );
    }

    function createMetadata(address metadata, address mint, address mintAuthority, address payer, address updateAuthority) public view {
        // Creator[] memory creators = new Creator[](1);
        // creators[0] = Creator({
        //     creatorAddress: payer,
        //     verified: false,
        //     share: 100
        // });

        DataV2 memory data = DataV2({
            name: "RGB",
            symbol: "RGB",
            uri: "https://raw.githubusercontent.com/ZYJLiu/rgb-png-generator/master/assets/40_183_132/40_183_132.json",
            sellerFeeBasisPoints: 0,
            creatorsPresent: false,
            // creators: creators,
            collectionPresent: false,
            // collection: Collection({
            //     verified: false,
            //     key: address(0)
            // }),
            usesPresent: false
            // uses: Uses({
            //     useMethod: UseMethod.Burn,
            //     remaining: 0,
            //     total: 0
            // })
        });

        CreateMetadataAccountArgsV3 memory args = CreateMetadataAccountArgsV3({
            data: data,
            isMutable: true,
            collectionDetailsPresent: false
            // collectionDetails: CollectionDetails({
            //     detailType: CollectionDetailsType.V1,
            //     size: 0
            // })
        });

        AccountMeta[7] metas = [
            AccountMeta({pubkey: metadata, is_writable: true, is_signer: false}),
            AccountMeta({pubkey: mint, is_writable: false, is_signer: false}),
            AccountMeta({pubkey: mintAuthority, is_writable: false, is_signer: true}),
            AccountMeta({pubkey: payer, is_writable: true, is_signer: true}),
            AccountMeta({pubkey: updateAuthority, is_writable: false, is_signer: false}),
            AccountMeta({pubkey: address"11111111111111111111111111111111", is_writable: false, is_signer: false}),
            AccountMeta({pubkey: address"SysvarRent111111111111111111111111111111111", is_writable: false, is_signer: false})
        ];

        bytes1 discriminator = 33;
        bytes bincode = abi.encode(discriminator, args);

        address'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'.call{accounts: metas}(bincode);
    }

    function createMintAndMetadata(address payer, address metadata, address mint, address mintAuthority, address freezeAuthority, uint8 decimals) public view {
        initializeMint(payer, mint, mintAuthority, freezeAuthority, decimals);
        createMetadata(metadata, mint, mintAuthority, payer, payer);
    }

    function initializeAssociatedTokenAccount(address payer, address tokenAccount, address mint, address owner) public view {
        AccountMeta[6] metas = [
			AccountMeta({pubkey: payer, is_writable: true, is_signer: true}),
			AccountMeta({pubkey: tokenAccount, is_writable: true, is_signer: false}),
			AccountMeta({pubkey: owner, is_writable: false, is_signer: false}),
			AccountMeta({pubkey: mint, is_writable: false, is_signer: false}),
			AccountMeta({pubkey: address"11111111111111111111111111111111", is_writable: false, is_signer: false}),
			AccountMeta({pubkey: address"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", is_writable: false, is_signer: false})
		];
        bytes bincode = abi.encode((0));
		address"ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL".call{accounts: metas}(bincode);
    }



    struct CreateMetadataAccountArgsV3 {
        DataV2 data;
        bool isMutable;
        bool collectionDetailsPresent; // To handle Rust Option<> in Solidity
        // CollectionDetails collectionDetails;
    }
    struct DataV2 {
        string name;
        string symbol;
        string uri;
        uint16 sellerFeeBasisPoints;
        bool creatorsPresent; // To handle Rust Option<> in Solidity
        // Creator[] creators;
        bool collectionPresent; // To handle Rust Option<> in Solidity
        // Collection collection;
        bool usesPresent; // To handle Rust Option<> in Solidity
        // Uses uses;
    }
    struct Creator {
        address creatorAddress;
        bool verified;
        uint8 share;
    }
    struct Collection {
        bool verified;
        address key;
    }
    enum CollectionDetailsType {
        V1
    }
    struct CollectionDetails {
        CollectionDetailsType detailType;
        uint64 size;
    }
    struct Uses {
        UseMethod useMethod;
        uint64 remaining;
        uint64 total;
    }
    enum UseMethod {
        Burn,
        Multiple,
        Single
    }

}
