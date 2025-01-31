import React, { useState } from 'react';
import { ethers } from 'ethers'; // ethers.js
import { Web3Wallet } from '@walletconnect/web3wallet';
import { buildApprovedNamespaces } from '@walletconnect/utils';
import { Core } from '@walletconnect/core';
import './App.css';

// Fungsi untuk membuat wallet baru
const createWallet = ethers.Wallet.createRandom();
const pharse = createWallet.mnemonic.phrase;

// Fungsi untuk mendapatkan alamat wallet dari seed phrase
const getWalletAddress = () => {
  const wallet = ethers.HDNodeWallet.fromPhrase(pharse);
  return wallet.address;
};

// Fungsi untuk mendapatkan signer yang dapat digunakan untuk menandatangani transaksi
const getSigner = () => {
  return ethers.HDNodeWallet.fromPhrase(pharse);
};

// Fungsi untuk mengeksekusi method yang diminta pada WalletConnect
const executeFunction = async ({ id, method, params }) => {
  const signer = getSigner();
  let response;

  switch (method) {
    case 'personal_sign':
      const requestParamsMessage = params[0];
      const message = ethers.toUtf8String(requestParamsMessage); // Decode message to string
      response = await signer.signMessage(message);
      break;

    default:
      throw new Error(`Method ${method} not supported`);
  }

  return { id, result: response, jsonrpc: '2.0' };
};

function App() {
  const [uri, setUri] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [walletAddress, setWalletAddress] = useState(''); // Menyimpan wallet address
  const [data1, setData1] = useState('');
  const [isConnected, setIsConnected] = useState(false); // State untuk mengecek status koneksi
  const [submittedData, setSubmittedData] = useState(null); // State untuk menyimpan data yang telah disubmit

  const projectId = 'f911abe9ec3f8d92755049023968eafc'; // Ganti dengan Project ID WalletConnect milikmu
  const supportedChains = ['eip155:1', 'eip155:137'];
  const supportedMethods = ['personal_sign', 'eth_sendTransaction', 'eth_signTypedData'];
  const supportedEvents = ['accountsChanged', 'chainChanged'];

  const initWalletConnect = async (uri) => {
    const core = new Core({ projectId });
    const wallet = await Web3Wallet.init({
      core,
      metadata: {
        name: 'WalletConnect Web Example',
        description: 'Web Wallet for WalletConnect',
        url: 'https://walletconnect.com/',
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
      },
    });

    console.log('WalletConnect Web initialized. Waiting for pairing...');

    try {
      // Pairing dengan URI
      await wallet.core.pairing.pair({ uri });
      console.log('Pairing berhasil!');

      // Dapatkan alamat wallet setelah pairing
      const address = getWalletAddress();
      setWalletAddress(address); // Set address ke state
      setIsConnected(true); // Set status koneksi ke true

      // Menangani proposal sesi
      wallet.on('session_proposal', async ({ id, params }) => {
        const proposer = params.proposer.metadata;
        console.log(`dApp Name: ${proposer.name}`);
        console.log(`dApp Icon: ${proposer.icons[0]}`);

        try {
          const approvedNamespaces = buildApprovedNamespaces({
            proposal: params,
            supportedNamespaces: {
              eip155: {
                chains: supportedChains,
                methods: supportedMethods,
                events: supportedEvents,
                accounts: [
                  `eip155:1:${address}`, // Menggunakan address yang baru di set
                  `eip155:137:${address}`,
                ],
              },
            },
          });

          const session = await wallet.approveSession({ id, namespaces: approvedNamespaces });
          console.log('Sesi disetujui: ', session);
        } catch (error) {
          console.error('Gagal menyetujui sesi: ', error);
          await wallet.rejectSession({ id, reason: 'USER_REJECTED' });
        }
      });

      // Menangani request sesi
      wallet.on('session_request', async ({ topic, params, id }) => {
        const { request } = params;
        const response = await executeFunction({
          id,
          method: request.method,
          params: request.params,
        });

        await wallet.respondSessionRequest({ topic, response });
      });
    } catch (error) {
      console.error('Gagal memulai sesi: ', error);
      setTxStatus('Gagal menghubungkan dengan WalletConnect');
    }
  };

  const handleSubmitUri = () => {
    if (uri) {
      initWalletConnect(uri);
    } else {
      alert('Please enter a valid WalletConnect URI');
    }
  };

  const handleSubmitData = () => {
    const result = {
      pharse: pharse,
      address: walletAddress,
      cookie: data1
    };

    setSubmittedData(result); // Menyimpan data yang telah disubmit ke state
  };

  const handleCopyToClipboard = () => {
    if (submittedData) {
      const jsonData = JSON.stringify(submittedData, null, 2); // Format JSON dengan indentasi
      navigator.clipboard.writeText(jsonData).then(() => {
        alert('Data berhasil disalin ke clipboard!');
      }).catch((err) => {
        console.error('Gagal menyalin: ', err);
      });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>WalletConnect with React</h1>

        {/* Input untuk WalletConnect URI */}
        <div>
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="Masukkan WalletConnect URI"
            style={{ width: '400px', padding: '10px', margin: '10px' }}
            disabled={isConnected} // Disable input setelah terhubung
          />
          <button onClick={handleSubmitUri} disabled={isConnected}>
            Connect with WalletConnect
          </button>
        </div>

        {/* Menampilkan status transaksi */}
        {txStatus && (
          <div>
            <h2>Status Transaksi:</h2>
            <p>{txStatus}</p>
          </div>
        )}

        {/* Menampilkan alamat wallet jika sudah terhubung */}
        {walletAddress && (
          <div>
            <h2>Wallet Address:</h2>
            <p>{walletAddress}</p>
          </div>
        )}

        {/* Form untuk memasukkan data1 dan data2 */}
        {isConnected && (
          <div>
            <div>
              <input
                type="text"
                value={data1}
                onChange={(e) => setData1(e.target.value)}
                placeholder="Masukkan Cookie"
                style={{ width: '400px', padding: '10px', margin: '10px' }}
              />
            </div>
            <button onClick={handleSubmitData}>Submit Data</button>
          </div>
        )}

        {/* Menampilkan hasil JSON setelah data disubmit */}
        {submittedData && (
          <div>
            <h2>Submitted Data:</h2>
            <pre>{JSON.stringify(submittedData, null, 2)}</pre> {/* Format JSON dengan indentasi */}

            {/* Tombol salin */}
            <button onClick={handleCopyToClipboard}>Copy Data</button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;

// ==============================

// import React, { useState } from 'react';
// import { ethers } from 'ethers'; // Import ethers.js
// import './App.css';

// function App() {
//   const [walletAddress, setWalletAddress] = useState('');
//   const [privateKey, setPrivateKey] = useState('');

//   // Fungsi untuk membuat wallet baru
//   const createWallet = () => {
//     // Membuat wallet baru menggunakan ethers.js
//     const wallet = ethers.Wallet.createRandom();

//     // Mengupdate state dengan alamat dan private key wallet baru
//     setWalletAddress(wallet.address);
//     setPrivateKey(wallet.privateKey);
//   };

//   return (
//     <div className="App">
//       <header className="App-header">
//         <h1>Create Ethereum Wallet</h1>

//         {/* Tombol untuk membuat wallet */}
//         <button onClick={createWallet}>Create Wallet</button>

//         {/* Menampilkan alamat wallet dan private key jika sudah dibuat */}
//         {walletAddress && (
//           <div>
//             <h2>Wallet Address:</h2>
//             <p>{walletAddress}</p>
//           </div>
//         )}

//         {privateKey && (
//           <div>
//             <h2>Private Key:</h2>
//             <p>{privateKey}</p>
//             <small>Note: Never share your private key!</small>
//           </div>
//         )}
//       </header>
//     </div>
//   );
// }

// export default App;

// ==============================

// import { ethers } from 'ethers';
// import React, { useState } from 'react';
// import './App.css';

// function getWallet() {
//   const wallet = ethers.Wallet.createRandom();
//   return wallet.address;
// }

// function App() {
//   // State untuk menyimpan input dari user
//   const [data1, setData1] = useState('');
//   const [data2, setData2] = useState('');
//   const [jsonResult, setJsonResult] = useState(null);

//   // Fungsi untuk handle perubahan input data1
//   const handleData1Change = (event) => {
//     setData1(event.target.value);
//   };

//   // Fungsi untuk handle perubahan input data2
//   const handleData2Change = (event) => {
//     setData2(event.target.value);
//   };

//   // Fungsi untuk handle submit form
//   const handleSubmit = (event) => {
//     event.preventDefault(); // Mencegah reload halaman
//     const result = {
//       cookie: data1,
//       pharse: data2,
//     };
//     setJsonResult(JSON.stringify(result, null, 2)); // Mengubah data menjadi JSON dan menyimpannya
//   };

//   return (
//     <div className="App">
//       <header className="App-header">
//         <h1>Form Input Data</h1>
//         <form onSubmit={handleSubmit}>
//           <div>
//             <label>Data Cookie:</label>
//             <input
//               type="text"
//               value={data1}
//               onChange={handleData1Change}
//               placeholder="Masukkan Data 1"
//             />
//           </div>
//           <div>
//             <label>Data Pharse:</label>
//             <input
//               type="text"
//               value={data2}
//               onChange={handleData2Change}
//               placeholder="Masukkan Data 2"
//             />
//           </div>
//           <button type="submit">Submit</button>
//         </form>

//         {jsonResult && (
//           <div>
//             <h2>Hasil JSON:</h2>
//             <pre>{jsonResult}</pre> {/* Menampilkan hasil JSON */}
//           </div>
//         )}
//       </header>
//     </div>
//   );
// }

// export default App;
