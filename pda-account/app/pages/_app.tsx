import { ChakraProvider } from "@chakra-ui/react"
import WalletContextProvider from "../contexts/WalletContextProvider"
import { ProgramProvider } from "@/contexts/ProgramContextProvider"
import type { AppProps } from "next/app"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <WalletContextProvider>
        <ProgramProvider>
          <Component {...pageProps} />
        </ProgramProvider>
      </WalletContextProvider>
    </ChakraProvider>
  )
}
