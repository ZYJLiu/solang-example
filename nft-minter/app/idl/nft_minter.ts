export type NftMinter = {
  version: "0.3.0"
  name: "nft_minter"
  instructions: [
    {
      name: "get_mint_account_data"
      docs: [
        "notice: Retrieve the information saved in a mint account",
        "param: the account whose information we want to retrive",
        "return: the MintAccountData struct"
      ]
      accounts: [
        {
          name: "dataAccount"
          isMut: false
          isSigner: false
          isOptional: false
        }
      ]
      args: [
        {
          name: "mintaccount"
          type: "publicKey"
        }
      ]
      returns: {
        defined: "MintAccountData"
      }
    },
    {
      name: "remove_mint_authority"
      docs: [
        "notice: Remove the mint authority from a mint account",
        "param: the public key for the mint account",
        "param: the public for the mint authority"
      ]
      accounts: [
        {
          name: "dataAccount"
          isMut: false
          isSigner: false
          isOptional: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
          isOptional: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
          isOptional: false
        }
      ]
      args: [
        {
          name: "mintaccount"
          type: "publicKey"
        },
        {
          name: "mintauthority"
          type: "publicKey"
        }
      ]
    },
    {
      name: "new"
      accounts: [
        {
          name: "dataAccount"
          isMut: true
          isSigner: false
          isOptional: false
        },
        {
          name: "wallet"
          isMut: false
          isSigner: true
          isOptional: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
          isOptional: false
        }
      ]
      args: [
        {
          name: "payer"
          type: "publicKey"
        },
        {
          name: "bump"
          type: "bytes"
        }
      ]
    },
    {
      name: "mintNft"
      accounts: [
        {
          name: "dataAccount"
          isMut: false
          isSigner: false
          isOptional: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
          isOptional: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
          isOptional: false
        },
        {
          name: "associatedTokenProgram"
          isMut: false
          isSigner: false
          isOptional: false
        }
      ]
      args: [
        {
          name: "payer"
          type: "publicKey"
        },
        {
          name: "mint"
          type: "publicKey"
        },
        {
          name: "metadata"
          type: "publicKey"
        },
        {
          name: "tokenaccount"
          type: "publicKey"
        },
        {
          name: "uri"
          type: "string"
        }
      ]
    }
  ]
  types: [
    {
      name: "MintAccountData"
      type: {
        kind: "struct"
        fields: [
          {
            name: "authority_present"
            type: "bool"
          },
          {
            name: "mint_authority"
            type: "publicKey"
          },
          {
            name: "supply"
            type: "u64"
          },
          {
            name: "decimals"
            type: "u8"
          },
          {
            name: "is_initialized"
            type: "bool"
          },
          {
            name: "freeze_authority_present"
            type: "bool"
          },
          {
            name: "freeze_authority"
            type: "publicKey"
          }
        ]
      }
    }
  ]
  metadata: {
    address: "BT8erxs1iCbmWXKwfMb4VDKUmEN2TNHBRYoex1JcnqYN"
  }
}

export const IDL: NftMinter = {
  version: "0.3.0",
  name: "nft_minter",
  instructions: [
    {
      name: "get_mint_account_data",
      docs: [
        "notice: Retrieve the information saved in a mint account",
        "param: the account whose information we want to retrive",
        "return: the MintAccountData struct",
      ],
      accounts: [
        {
          name: "dataAccount",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
      ],
      args: [
        {
          name: "mintaccount",
          type: "publicKey",
        },
      ],
      returns: {
        defined: "MintAccountData",
      },
    },
    {
      name: "remove_mint_authority",
      docs: [
        "notice: Remove the mint authority from a mint account",
        "param: the public key for the mint account",
        "param: the public for the mint authority",
      ],
      accounts: [
        {
          name: "dataAccount",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
      ],
      args: [
        {
          name: "mintaccount",
          type: "publicKey",
        },
        {
          name: "mintauthority",
          type: "publicKey",
        },
      ],
    },
    {
      name: "new",
      accounts: [
        {
          name: "dataAccount",
          isMut: true,
          isSigner: false,
          isOptional: false,
        },
        {
          name: "wallet",
          isMut: false,
          isSigner: true,
          isOptional: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
      ],
      args: [
        {
          name: "payer",
          type: "publicKey",
        },
        {
          name: "bump",
          type: "bytes",
        },
      ],
    },
    {
      name: "mintNft",
      accounts: [
        {
          name: "dataAccount",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
      ],
      args: [
        {
          name: "payer",
          type: "publicKey",
        },
        {
          name: "mint",
          type: "publicKey",
        },
        {
          name: "metadata",
          type: "publicKey",
        },
        {
          name: "tokenaccount",
          type: "publicKey",
        },
        {
          name: "uri",
          type: "string",
        },
      ],
    },
  ],
  types: [
    {
      name: "MintAccountData",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority_present",
            type: "bool",
          },
          {
            name: "mint_authority",
            type: "publicKey",
          },
          {
            name: "supply",
            type: "u64",
          },
          {
            name: "decimals",
            type: "u8",
          },
          {
            name: "is_initialized",
            type: "bool",
          },
          {
            name: "freeze_authority_present",
            type: "bool",
          },
          {
            name: "freeze_authority",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  metadata: {
    address: "BT8erxs1iCbmWXKwfMb4VDKUmEN2TNHBRYoex1JcnqYN",
  },
}
