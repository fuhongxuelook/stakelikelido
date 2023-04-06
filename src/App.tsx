import React, { useEffect } from "react";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/ethereum-provider";
import { Contract, providers, utils } from "ethers";

// @ts-ignore
import "./App.css";
import { formatAuthMessage } from "./utils";
import { NowContract } from "./constants";

let REACT_APP_INFURA_ID = "87S6H45F20KHG753VB5Q";

function App() {
  const web3Modal = new Web3Modal({
    network: "mainnet",
    cacheProvider: true,
    providerOptions: {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: REACT_APP_INFURA_ID,
        },
      },
    },
  });

  const [chainId, setChainId] = React.useState<number>(1);
  const [waiting, setWaiting] = React.useState<boolean>(false);
  const [hash, setHash] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [value, setValue] = React.useState<number>();
  const [address, setAddress] = React.useState<string>("");
  const [provider, setProvider] = React.useState<providers.Web3Provider>();

  function accountsChanged(accounts: string[]) {
    console.log("accountsChanged", accounts);
    setAddress(accounts[0]);
  }

  function chainChanged(chainId: number) {
    console.log("chainChanged", chainId);
    setChainId(chainId);
  }

  function reset() {
    console.log("reset");
    setAddress("");
    setProvider(undefined);
    web3Modal.clearCachedProvider();
  }

  useEffect(() => {
    setHash('')
    setError('')
  }, [address, chainId, provider, value]);

  async function connect() {
    if (!REACT_APP_INFURA_ID) {
      throw new Error("Missing Infura Id");
    }
    const web3Provider = await web3Modal.connect();

    web3Provider.on("accountsChanged", accountsChanged);
    web3Provider.on("chainChanged", chainChanged);
    web3Provider.on("disconnect", reset);

    const accounts = (await web3Provider.enable()) as string[];
    setAddress(accounts[0]);
    setChainId(web3Provider.chainId);

    const provider = new providers.Web3Provider(web3Provider);
    setProvider(provider);
  }

  async function signMessage() {
    if (!provider) {
      throw new Error("Provider not connected");
    }
    const msg = formatAuthMessage(address, chainId);
    const sig = await provider.send("personal_sign", [msg, address]);
    console.log("Signature", sig);
    console.log("isValid", utils.verifyMessage(msg, sig) === utils.getAddress(address));
  }

  function checkChainSupported() {
    const chains = [5]
    if (chains.indexOf(Number(chainId)) === -1) {
      setError(`Only supported on chain: ${chains.join(', ')}`)

      return false;
    }
    return true
  }

  async function deposit() {
    if (!provider) {
      return setError('Provider not connected')
    }

    if (!checkChainSupported()) return

    if (!value) {
      return setError('Please enter Amount')
    }
    if (waiting) {
      return setError('Please finish the previous transaction')
    }

    setHash('')
    setError('')
    setWaiting(true)
    try {
      const contract = new Contract(NowContract.address, NowContract.abi, provider.getSigner());
      const res = await contract.deposit({
        value: utils.parseEther(value.toString()),
      });
      setHash(res.hash);
      setWaiting(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'something went wrong')
      setWaiting(false)
    }
  }

  return (
    <div className="App">
      <div className="content">
        {address ? (
          <>
            <div>Connected: {address}</div>
            <div>ChainID: {chainId}</div>
            <div>
              Amount:
              <input
                type="number"
                min={0}
                max={999999999}
                step={0.01}
                value={value} onChange={e => {setValue(e.target.valueAsNumber)}}
              />
            </div>
            {hash ? (
              <div className="hash-wrap">
                <div>
                  success hash: {hash}
                </div>
                <div className="close"
                  onClick={e => setHash('')}
                >x</div>
              </div>
            ) : null}
            {error ? (
              <div className="error-wrap">
                <div>
                  error: {error}
                </div>
                <div className="close"
                  onClick={e => setError('')}
                >x</div>
              </div>
            ) : null}
            {/* <button onClick={signMessage}>Authenticate</button> */}
            <button disabled={!value} onClick={deposit}>
              {waiting ? 'waiting' : 'deposit'}
            </button>
          </>
        ) : (
          <>
            <div>Not connected</div>
            <button onClick={connect}>Connect</button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
