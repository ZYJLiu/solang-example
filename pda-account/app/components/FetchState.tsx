import { VStack, Text } from "@chakra-ui/react"
import { AccountInfo, PublicKey } from "@solana/web3.js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { struct, bool } from "@coral-xyz/borsh"
import { useProgram } from "@/contexts/ProgramContextProvider"
// import { program } from "@/utils/anchorSetup"

// This is the schema for the account data
// Approach doesn't work if account struct is more complex, likely due to Solang differences
class MyBufferSchema {
  isInitialized: boolean
  value: boolean

  constructor(isInitialized: boolean, value: boolean) {
    this.isInitialized = isInitialized
    this.value = value
  }

  static borshAccountSchema = struct([bool("isInitialized"), bool("value")])

  static deserialize(buffer?: Buffer): MyBufferSchema | null {
    if (!buffer) {
      return null
    }

    try {
      const { isInitialized, value } = this.borshAccountSchema.decode(buffer)
      return new MyBufferSchema(isInitialized, value)
    } catch (error) {
      console.log("Deserialization error:", error)
      return null
    }
  }
}

export default function FetchState() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { program } = useProgram()
  const [bool, setBool] = useState("")
  const [buffer, setBuffer] = useState("")

  useEffect(() => {
    if (!publicKey || !program) return

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("seed"), publicKey.toBuffer()],
      program.programId
    )

    // Helper function to update the local state with the account data
    const updateState = (accountInfo: AccountInfo<Buffer>) => {
      // console.log(accountInfo.data)
      // offset 16 bytes, Solang specific
      const offsetBuffer = accountInfo.data.slice(16)
      const myBuffer = MyBufferSchema.deserialize(offsetBuffer)

      setBool(myBuffer?.value ? "True" : "False")
      setBuffer(Array.from(accountInfo.data).join(", "))
    }

    // Fetch initial account data
    const fetchAccountData = async () => {
      const accountInfo = await connection.getAccountInfo(pda)
      if (accountInfo) {
        updateState(accountInfo)
      }
    }

    fetchAccountData()

    // Subscribe to the state PDA account change
    const subscriptionId = connection.onAccountChange(pda, updateState)

    return () => {
      // Unsubscribe from the account change subscription
      connection.removeAccountChangeListener(subscriptionId)
    }
  }, [publicKey, program])

  return (
    <VStack>
      <Text>{bool}</Text>
      <Text>{buffer}</Text>
    </VStack>
  )
}
