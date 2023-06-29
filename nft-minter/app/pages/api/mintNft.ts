import { NextApiRequest, NextApiResponse } from "next"
import {
  PublicKey,
  Keypair,
  Transaction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js"
import { program, connection } from "@/utils/setup"
import { uris } from "@/utils/uri"
import { Metaplex } from "@metaplex-foundation/js"
import { getAssociatedTokenAddressSync } from "@solana/spl-token"

function get(res: NextApiResponse) {
  res.status(200).json({
    label: "My Store",
    icon: "https://solana.com/src/img/branding/solanaLogoMark.svg",
  })
}

async function post(req: NextApiRequest, res: NextApiResponse) {
  const { account } = req.body
  const { reference } = req.query

  if (!account || !reference) {
    res.status(400).json({
      error: "Required data missing. Account or reference not provided.",
    })
    return
  }

  try {
    const transaction = await buildTransaction(
      new PublicKey(account),
      new PublicKey(reference)
    )
    res.status(200).json({
      transaction,
      message: "Please approve the transaction to mint your NFT!",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "error creating transaction" })
    return
  }
}

async function buildTransaction(account: PublicKey, reference: PublicKey) {
  // Required solang dataAccount, even though we're not using it.
  const [dataAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("seed")],
    program.programId
  )

  // Generate a keypair to use for mint
  const mint = Keypair.generate()

  // Derive the mint's metadata account address.
  const metaplex = Metaplex.make(connection)
  const metadata = await metaplex
    .nfts()
    .pdas()
    .metadata({ mint: mint.publicKey })

  // Derive the associated token account address for the user scanning the QR code.
  const tokenAccount = getAssociatedTokenAddressSync(mint.publicKey, account)

  // Randomly select a uri.
  const randomUri = uris[Math.floor(Math.random() * uris.length)]

  // Build the instruction to mint the NFT.
  const instruction = await program.methods
    .mintNft(
      account, // payer
      mint.publicKey, // mint account address
      metadata, // metadata account address
      tokenAccount, // associated token account address
      randomUri // uri
    )
    .accounts({ dataAccount: dataAccount }) // required even though it is not used
    .remainingAccounts([
      {
        pubkey: account, // payer, mint authority, freeze authority, update authority, token account owner (all the same for this example)
        isWritable: true,
        isSigner: true,
      },
      {
        pubkey: mint.publicKey, // mint address
        isWritable: true,
        isSigner: true,
      },
      {
        pubkey: tokenAccount, // token account address
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: metadata, // metadata account address
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"), // metadata program
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: SYSVAR_RENT_PUBKEY, // Sysvar rent
        isWritable: false,
        isSigner: false,
      },
    ])
    .instruction()

  // Add the reference account to the instruction
  // Used in client to find the transaction once sent
  instruction.keys.push({
    pubkey: reference,
    isSigner: false,
    isWritable: false,
  })

  const latestBlockhash = await connection.getLatestBlockhash()

  // create new Transaction and add instruction
  const transaction = new Transaction({
    feePayer: account,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(instruction)

  // sign with mint keypair because we are using it to create a new mint
  transaction.sign(mint)

  return transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64")
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return get(res)
  } else if (req.method === "POST") {
    return await post(req, res)
  } else {
    return res.status(405).json({ error: "Method not allowed" })
  }
}
