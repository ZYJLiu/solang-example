export type PdaAccount = {
  version: "0.3.0"
  name: "pda_account"
  instructions: [
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
      name: "flip"
      docs: [
        "notice: A message that can be called on instantiated contracts.\nThis one flips the value of the stored `bool` from `true`\nto `false` and vice versa."
      ]
      accounts: [
        {
          name: "dataAccount"
          isMut: true
          isSigner: false
          isOptional: false
        }
      ]
      args: []
    },
    {
      name: "get"
      docs: ["notice: Simply returns the current value of our `bool`."]
      accounts: [
        {
          name: "dataAccount"
          isMut: false
          isSigner: false
          isOptional: false
        }
      ]
      args: []
      returns: "bool"
    }
  ]
  metadata: {
    address: "GwnWG8hjzBBnXRtQAmr3Cbo6ShYjv5s6NHTAdsmURXKa"
  }
}

export const IDL: PdaAccount = {
  version: "0.3.0",
  name: "pda_account",
  instructions: [
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
      name: "flip",
      docs: [
        "notice: A message that can be called on instantiated contracts.\nThis one flips the value of the stored `bool` from `true`\nto `false` and vice versa.",
      ],
      accounts: [
        {
          name: "dataAccount",
          isMut: true,
          isSigner: false,
          isOptional: false,
        },
      ],
      args: [],
    },
    {
      name: "get",
      docs: ["notice: Simply returns the current value of our `bool`."],
      accounts: [
        {
          name: "dataAccount",
          isMut: false,
          isSigner: false,
          isOptional: false,
        },
      ],
      args: [],
      returns: "bool",
    },
  ],
  metadata: {
    address: "GwnWG8hjzBBnXRtQAmr3Cbo6ShYjv5s6NHTAdsmURXKa",
  },
}
