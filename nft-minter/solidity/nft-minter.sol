
import "./spl_token.sol";
import "./system_instruction.sol";

@program_id("BT8erxs1iCbmWXKwfMb4VDKUmEN2TNHBRYoex1JcnqYN")
contract nft_minter {

    @payer(payer) // payer address
    @seed("seed") // hardcoded seed
    @bump(bump) // bump seed for pda address
    constructor(address payer, bytes bump) {}

    function mintNft(address payer, address mint, address metadata, address tokenAccount, string uri) public view {
        // Initialize mint account
        createMint(
            payer, // payer
            mint, // mint
            payer, // mint authority
            payer, // freeze authority
            0
        );

        // Initialize metadata account
        createMetadata(
            metadata, // metadata
            mint, // mint
            payer, // mint authority
            payer,  // payer
            payer, // update authority
            uri // uri
        );

        // Initialize associated token account
        createAssociatedTokenAccount(
            payer, // payer
            tokenAccount, // token account
            mint, // mint
            payer // owner
        );

        // Mint 1 token to the associated token account
        mintTokens(
            mint, // mint
            tokenAccount, // token account
            payer, // mint authority
            1
        );

        // Remove mint authority from mint account
        SplToken.remove_mint_authority(
            mint, // mint
            payer // mint authority
        );
    }

    // Initialize mint account
    function createMint(address payer, address mint, address mintAuthority, address freezeAuthority, uint8 decimals) internal view {
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
    }

    // Initialize associated token account
    function createAssociatedTokenAccount(address payer, address tokenAccount, address mint, address owner) internal view {
        AccountMeta[6] metas = [
			AccountMeta({pubkey: payer, is_writable: true, is_signer: true}),
			AccountMeta({pubkey: tokenAccount, is_writable: true, is_signer: false}),
			AccountMeta({pubkey: owner, is_writable: false, is_signer: false}),
			AccountMeta({pubkey: mint, is_writable: false, is_signer: false}),
			AccountMeta({pubkey: SystemInstruction.systemAddress, is_writable: false, is_signer: false}),
			AccountMeta({pubkey: SplToken.tokenProgramId, is_writable: false, is_signer: false})
		];

        bytes instructionData = abi.encode((0));
		address"ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL".call{accounts: metas}(instructionData);
    }

    // Mint tokens to the associated token account
    function mintTokens(address mint, address account, address authority, uint64 amount) internal view {
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

    // Create metadata account
    function createMetadata(address metadata, address mint, address mintAuthority, address payer, address updateAuthority, string uri) internal view {
        // Creator[] memory creators = new Creator[](1);
        // creators[0] = Creator({
        //     creatorAddress: payer,
        //     verified: false,
        //     share: 100
        // });

        DataV2 memory data = DataV2({
            name: "RGB",
            symbol: "RGB",
            uri: uri,
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
            AccountMeta({pubkey: SystemInstruction.systemAddress, is_writable: false, is_signer: false}),
            AccountMeta({pubkey: SystemInstruction.rentAddress, is_writable: false, is_signer: false})
        ];

        bytes1 discriminator = 33;
        bytes instructionData = abi.encode(discriminator, args);

        address'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'.call{accounts: metas}(instructionData);
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
