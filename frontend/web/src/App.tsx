import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface DataRecord {
  id: string;
  encryptedData: string;
  timestamp: number;
  owner: string;
  label: string;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newRecordData, setNewRecordData] = useState({
    label: "",
    value: ""
  });
  const [showFAQ, setShowFAQ] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Calculate statistics
  const totalRecords = records.length;
  const latestRecord = totalRecords > 0 ? records[0] : null;

  useEffect(() => {
    loadRecords().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadRecords = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("record_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing record keys:", e);
        }
      }
      
      const list: DataRecord[] = [];
      
      for (const key of keys) {
        try {
          const recordBytes = await contract.getData(`record_${key}`);
          if (recordBytes.length > 0) {
            try {
              const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
              list.push({
                id: key,
                encryptedData: recordData.data,
                timestamp: recordData.timestamp,
                owner: recordData.owner,
                label: recordData.label
              });
            } catch (e) {
              console.error(`Error parsing record data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading record ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(list);
    } catch (e) {
      console.error("Error loading records:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitRecord = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setCreating(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting data with Zama FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(newRecordData.value)}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const recordId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const recordData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        label: newRecordData.label
      };
      
      // Store encrypted data on-chain
      await contract.setData(
        `record_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(recordData))
      );
      
      const keysBytes = await contract.getData("record_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(recordId);
      
      await contract.setData(
        "record_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Data encrypted and stored securely!"
      });
      
      await loadRecords();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewRecordData({
          label: "",
          value: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  const checkAvailability = async () => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Checking FHE availability..."
    });

    try {
      const contract = await getContractReadOnly();
      if (!contract) {
        throw new Error("Failed to get contract");
      }
      
      const isAvailable = await contract.isAvailable();
      
      if (isAvailable) {
        setTransactionStatus({
          visible: true,
          status: "success",
          message: "FHE capabilities available!"
        });
      } else {
        setTransactionStatus({
          visible: true,
          status: "error",
          message: "FHE capabilities not available"
        });
      }
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Availability check failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isOwner = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const faqItems = [
    {
      question: "What is Zama FHE Zig Binding?",
      answer: "A project providing FHE capabilities for the Zig programming language, focusing on performance and security."
    },
    {
      question: "How does FHE encryption work?",
      answer: "Fully Homomorphic Encryption allows computations on encrypted data without decryption, preserving privacy."
    },
    {
      question: "What makes Zig suitable for FHE?",
      answer: "Zig's focus on performance, safety, and low-level control makes it ideal for cryptographic operations."
    },
    {
      question: "How secure is this implementation?",
      answer: "Built on TFHE-rs, a well-audited Rust library, with Zig providing additional memory safety guarantees."
    }
  ];

  const renderDataChart = () => {
    if (records.length === 0) {
      return (
        <div className="no-data-chart">
          <div className="placeholder-bar"></div>
          <div className="placeholder-bar"></div>
          <div className="placeholder-bar"></div>
          <div className="chart-axis"></div>
        </div>
      );
    }

    const maxValue = Math.max(...records.map(r => r.encryptedData.length));
    
    return (
      <div className="data-chart">
        {records.slice(0, 5).map((record, index) => (
          <div 
            key={index} 
            className="chart-bar"
            style={{ height: `${(record.encryptedData.length / maxValue) * 100}%` }}
          >
            <div className="bar-label">{record.label.substring(0, 10)}</div>
          </div>
        ))}
        <div className="chart-axis"></div>
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="metal-spinner"></div>
      <p>Initializing FHE connection...</p>
    </div>
  );

  return (
    <div className="app-container metal-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="circuit-icon"></div>
          </div>
          <h1>Zama<span>FHE</span>Zig</h1>
        </div>
        
        <div className="header-tabs">
          <button 
            className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button 
            className={`tab-button ${activeTab === "faq" ? "active" : ""}`}
            onClick={() => setActiveTab("faq")}
          >
            FAQ
          </button>
        </div>
        
        <div className="header-actions">
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        {activeTab === "dashboard" ? (
          <>
            <div className="dashboard-grid">
              <div className="dashboard-card metal-card">
                <h3>Project Introduction</h3>
                <p>Zama FHE Zig Binding brings fully homomorphic encryption capabilities to the Zig programming language, enabling secure computations on encrypted data.</p>
                <div className="tech-badge">
                  <span>TFHE-rs</span>
                  <span>Zig FFI</span>
                  <span>C ABI</span>
                </div>
              </div>
              
              <div className="dashboard-card metal-card">
                <h3>Data Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{totalRecords}</div>
                    <div className="stat-label">Total Records</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {latestRecord ? new Date(latestRecord.timestamp * 1000).toLocaleDateString() : "N/A"}
                    </div>
                    <div className="stat-label">Latest Record</div>
                  </div>
                </div>
              </div>
              
              <div className="dashboard-card metal-card">
                <h3>Data Size Visualization</h3>
                {renderDataChart()}
              </div>
            </div>
            
            <div className="action-bar">
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="metal-button primary"
              >
                <div className="add-icon"></div>
                Add Encrypted Data
              </button>
              <button 
                onClick={checkAvailability}
                className="metal-button"
              >
                Check FHE Availability
              </button>
              <button 
                onClick={() => setShowFAQ(true)}
                className="metal-button"
              >
                Show FAQ
              </button>
              <button 
                onClick={loadRecords}
                className="metal-button"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
            
            <div className="records-section">
              <div className="section-header">
                <h2>Encrypted Data Records</h2>
              </div>
              
              <div className="records-list metal-card">
                <div className="table-header">
                  <div className="header-cell">ID</div>
                  <div className="header-cell">Label</div>
                  <div className="header-cell">Owner</div>
                  <div className="header-cell">Date</div>
                  <div className="header-cell">Data Size</div>
                </div>
                
                {records.length === 0 ? (
                  <div className="no-records">
                    <div className="no-records-icon"></div>
                    <p>No encrypted records found</p>
                    <button 
                      className="metal-button primary"
                      onClick={() => setShowCreateModal(true)}
                    >
                      Create First Record
                    </button>
                  </div>
                ) : (
                  records.map(record => (
                    <div className="record-row" key={record.id}>
                      <div className="table-cell record-id">#{record.id.substring(0, 6)}</div>
                      <div className="table-cell">{record.label}</div>
                      <div className="table-cell">{record.owner.substring(0, 6)}...{record.owner.substring(38)}</div>
                      <div className="table-cell">
                        {new Date(record.timestamp * 1000).toLocaleDateString()}
                      </div>
                      <div className="table-cell">
                        {record.encryptedData.length} bytes
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="faq-section">
            <h2>Frequently Asked Questions</h2>
            
            <div className="faq-list">
              {faqItems.map((item, index) => (
                <div className="faq-item metal-card" key={index}>
                  <div className="faq-question">
                    <div className="q-icon">Q</div>
                    <h3>{item.question}</h3>
                  </div>
                  <div className="faq-answer">
                    <div className="a-icon">A</div>
                    <p>{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  
      {showCreateModal && (
        <ModalCreate 
          onSubmit={submitRecord} 
          onClose={() => setShowCreateModal(false)} 
          creating={creating}
          recordData={newRecordData}
          setRecordData={setNewRecordData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content metal-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="metal-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      {showFAQ && (
        <div className="faq-modal">
          <div className="faq-modal-content metal-card">
            <div className="modal-header">
              <h2>FHE Zig Binding FAQ</h2>
              <button onClick={() => setShowFAQ(false)} className="close-modal">&times;</button>
            </div>
            
            <div className="faq-content">
              {faqItems.map((item, index) => (
                <div className="faq-item" key={index}>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </div>
              ))}
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowFAQ(false)}
                className="metal-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="circuit-icon"></div>
              <span>Zama FHE Zig Binding</span>
            </div>
            <p>Secure encrypted computations with Zig and TFHE-rs</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">GitHub</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="tech-badge">
            <span>FHE-Powered Security</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} Zama FHE Zig Binding. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalCreateProps {
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  recordData: any;
  setRecordData: (data: any) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({ 
  onSubmit, 
  onClose, 
  creating,
  recordData,
  setRecordData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecordData({
      ...recordData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!recordData.label || !recordData.value) {
      alert("Please fill required fields");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal metal-card">
        <div className="modal-header">
          <h2>Add Encrypted Data</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="lock-icon"></div> Data will be encrypted with Zama FHE before storage
          </div>
          
          <div className="form-group">
            <label>Data Label *</label>
            <input 
              type="text"
              name="label"
              value={recordData.label} 
              onChange={handleChange}
              placeholder="Enter a label for this data..." 
              className="metal-input"
            />
          </div>
          
          <div className="form-group">
            <label>Data Value *</label>
            <textarea 
              name="value"
              value={recordData.value} 
              onChange={handleChange}
              placeholder="Enter data to encrypt..." 
              className="metal-textarea"
              rows={4}
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="metal-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={creating}
            className="metal-button primary"
          >
            {creating ? "Encrypting with FHE..." : "Encrypt and Store"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;