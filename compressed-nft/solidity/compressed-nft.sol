
import "solana";

@program_id("7NjZqoBmcZxZ6n2WwEPAsTbn68fVHszecNdYWHM7dfhq")
contract compressed_nft {

    @payer(payer) // payer address
    @seed("seed") // hardcoded seed
    @bump(bump) // bump seed for pda address
    constructor(address payer, bytes bump) {}

    function mint(address tree_authority, address leaf_owner, address leaf_delegate, address merkle_tree, address payer, address tree_delegate, string uri) public view{
        print("Minting Compressed NFT");
        Creator[] memory creators = new Creator[](0);
        // creators[0] = Creator({
        //     creatorAddress: payer,
        //     verified: false,
        //     share: 100
        // });

        MetadataArgs memory args = MetadataArgs({
            name: "RGB",
            symbol: "RGB",
            uri: uri,
            sellerFeeBasisPoints: 0,
            primarySaleHappened: false,
            isMutable: true,
            editionNoncePresent: false,
            // editionNonce: 0,
            tokenStandardPresent: true,
            tokenStandard: TokenStandard.NonFungible,
            collectionPresent: false,
            // collection: Collection({
            //     verified: false,
            //     key: address(0)
            // }),
            usesPresent: false,
            // uses: Uses({
            //     useMethod: UseMethod.Burn,
            //     remaining: 0,
            //     total: 0
            // }),
            tokenProgramVersion: TokenProgramVersion.Original,
            creators: creators
        });

        AccountMeta[9] metas = [
            AccountMeta({pubkey: tree_authority, is_writable: true, is_signer: false}),
            AccountMeta({pubkey: leaf_owner, is_writable: false, is_signer: false}),
            AccountMeta({pubkey: leaf_delegate, is_writable: false, is_signer: false}),
            AccountMeta({pubkey: merkle_tree, is_writable: true, is_signer: false}),
            AccountMeta({pubkey: payer, is_writable: true, is_signer: true}),
            AccountMeta({pubkey: tree_delegate, is_writable: true, is_signer: true}),
            AccountMeta({pubkey: address"noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV", is_writable: false, is_signer: false}),
            AccountMeta({pubkey: address"cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK", is_writable: false, is_signer: false}),
            AccountMeta({pubkey: address"11111111111111111111111111111111", is_writable: false, is_signer: false})
        ];

        bytes8 discriminator = 0x9162c076b8937668;
        bytes instructionData = abi.encode(discriminator, args);

        address'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'.call{accounts: metas}(instructionData);
    }

    struct MetadataArgs {
        string name;
        string symbol;
        string uri;
        uint16 sellerFeeBasisPoints;
        bool primarySaleHappened;
        bool isMutable;
        bool editionNoncePresent;
        // uint8 editionNonce;
        bool tokenStandardPresent;
        TokenStandard tokenStandard;
        bool collectionPresent;
        // Collection collection;
        bool usesPresent;
        // Uses uses;
        TokenProgramVersion tokenProgramVersion;
        Creator[] creators;
    }

    enum TokenStandard {
        NonFungible,
        FungibleAsset,
        Fungible,
        NonFungibleEdition
    }

    enum TokenProgramVersion {
        Original,
        Token2022
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
