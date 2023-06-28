export type CompressedNft = {
  "version": "0.3.0",
  "name": "compressed_nft",
  "instructions": [
    {
      "name": "new",
      "accounts": [
        {
          "name": "dataAccount",
          "isMut": true,
          "isSigner": false,
          "isOptional": false
        },
        {
          "name": "wallet",
          "isMut": false,
          "isSigner": true,
          "isOptional": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false,
          "isOptional": false
        }
      ],
      "args": [
        {
          "name": "payer",
          "type": "publicKey"
        },
        {
          "name": "bump",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "mint",
      "accounts": [
        {
          "name": "dataAccount",
          "isMut": false,
          "isSigner": false,
          "isOptional": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false,
          "isOptional": false
        }
      ],
      "args": [
        {
          "name": "treeAuthority",
          "type": "publicKey"
        },
        {
          "name": "leafOwner",
          "type": "publicKey"
        },
        {
          "name": "leafDelegate",
          "type": "publicKey"
        },
        {
          "name": "merkleTree",
          "type": "publicKey"
        },
        {
          "name": "payer",
          "type": "publicKey"
        },
        {
          "name": "treeDelegate",
          "type": "publicKey"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    }
  ],
  "metadata": {
    "address": "7NjZqoBmcZxZ6n2WwEPAsTbn68fVHszecNdYWHM7dfhq"
  }
};

export const IDL: CompressedNft = {
  "version": "0.3.0",
  "name": "compressed_nft",
  "instructions": [
    {
      "name": "new",
      "accounts": [
        {
          "name": "dataAccount",
          "isMut": true,
          "isSigner": false,
          "isOptional": false
        },
        {
          "name": "wallet",
          "isMut": false,
          "isSigner": true,
          "isOptional": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false,
          "isOptional": false
        }
      ],
      "args": [
        {
          "name": "payer",
          "type": "publicKey"
        },
        {
          "name": "bump",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "mint",
      "accounts": [
        {
          "name": "dataAccount",
          "isMut": false,
          "isSigner": false,
          "isOptional": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false,
          "isOptional": false
        }
      ],
      "args": [
        {
          "name": "treeAuthority",
          "type": "publicKey"
        },
        {
          "name": "leafOwner",
          "type": "publicKey"
        },
        {
          "name": "leafDelegate",
          "type": "publicKey"
        },
        {
          "name": "merkleTree",
          "type": "publicKey"
        },
        {
          "name": "payer",
          "type": "publicKey"
        },
        {
          "name": "treeDelegate",
          "type": "publicKey"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    }
  ],
  "metadata": {
    "address": "7NjZqoBmcZxZ6n2WwEPAsTbn68fVHszecNdYWHM7dfhq"
  }
};
