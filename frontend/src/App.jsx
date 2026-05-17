import { useState, useEffect } from 'react';

const App = () => {
    const [meshState, setMeshState] = useState({ devices: [], idempotencyCacheSize: 0 });
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [logs, setLogs] = useState([]);
    
    const [senderVpa, setSenderVpa] = useState('alice@demo');
    const [receiverVpa, setReceiverVpa] = useState('bob@demo');
    const [amount, setAmount] = useState('500');
    const [pin, setPin] = useState('1234');

    const [showSuccess, setShowSuccess] = useState(false);
    const [successDetails, setSuccessDetails] = useState(null);

    const addLog = (msg) => {
        setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 50));
    };

    const fetchData = async () => {
        try {
            const [mRes, aRes, tRes] = await Promise.all([
                fetch('/api/mesh/state'),
                fetch('/api/accounts'),
                fetch('/api/transactions')
            ]);
            if(mRes.ok) setMeshState(await mRes.json());
            if(aRes.ok) setAccounts(await aRes.json());
            if(tRes.ok) setTransactions(await tRes.json());
        } catch (e) {
            console.error("Failed to fetch data", e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleSend = async () => {
        try {
            const res = await fetch('/api/demo/send', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ senderVpa, receiverVpa, amount: parseFloat(amount), pin, ttl: 5, startDevice: 'phone-alice' })
            });
            const r = await res.json();
            addLog(`📤 Packet ${r.packetId.substring(0,8)} injected at ${r.injectedAt} (TTL ${r.ttl})`);
            fetchData();
        } catch(e) { addLog(`❌ Error: ${e.message}`); }
    };

    const handleGossip = async () => {
        try {
            const res = await fetch('/api/mesh/gossip', {method: 'POST'});
            const r = await res.json();
            addLog(`🔄 Gossip: ${r.transfers} transfers across mesh`);
            fetchData();
        } catch(e) { addLog(`❌ Error: ${e.message}`); }
    };

    const handleFlush = async () => {
        try {
            const res = await fetch('/api/mesh/flush', {method: 'POST'});
            const r = await res.json();
            addLog(`📡 ${r.uploadsAttempted} bridge upload(s) attempted`);
            
            let settledCount = 0;
            r.results?.forEach(res => {
                addLog(`   ↳ ${res.bridgeNode} pkt ${res.packetId.substring(0,8)} → ${res.outcome}`);
                if (res.outcome === 'SETTLED') settledCount++;
            });
            
            fetchData();

            // Show success modal if at least one payment was settled
            if (settledCount > 0) {
                setSuccessDetails({ message: `${settledCount} Offline Payment(s) Successfully Synced & Settled!` });
                setShowSuccess(true);
                // Auto close after 4 seconds
                setTimeout(() => setShowSuccess(false), 4000);
            }
        } catch(e) { addLog(`❌ Error: ${e.message}`); }
    };

    const handleReset = async () => {
        try {
            await fetch('/api/mesh/reset', {method: 'POST'});
            addLog('🗑 Mesh and idempotency cache cleared');
            fetchData();
        } catch(e) { addLog(`❌ Error: ${e.message}`); }
    };

    return (
        <div className="max-w-7xl mx-auto relative">
            {/* Success Modal */}
            {showSuccess && successDetails && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-slate-800 border border-emerald-500/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center transform scale-100 transition-all duration-300">
                        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Payment Successful!</h2>
                        <p className="text-slate-300 mb-8 font-medium">{successDetails.message}</p>
                        <button 
                            onClick={() => setShowSuccess(false)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-emerald-500/30 active:scale-95"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                    UPI Offline Mesh
                </h1>
                <p className="text-slate-400">React + Tailwind Demo • Encrypted packets gossip via Bluetooth until uploaded</p>
            </header>

            <div className="grid lg:grid-cols-[350px_1fr] gap-6 items-start">
                {/* Sidebar Controls */}
                <div className="grid gap-6">
                    <div className="bg-slate-800/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg transition hover:shadow-xl">
                        <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-white/10 flex items-center gap-2 text-white">🎮 Controls</h2>
                        
                        <div className="mb-6">
                            <div className="font-semibold mb-2">1. Inject Payment</div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">From</label>
                                    <select value={senderVpa} onChange={e => setSenderVpa(e.target.value)} className="w-full bg-slate-900/60 border border-white/10 text-white p-2 rounded-lg text-sm focus:border-blue-500 outline-none transition">
                                        <option>alice@demo</option>
                                        <option>bob@demo</option>
                                        <option>carol@demo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">To</label>
                                    <select value={receiverVpa} onChange={e => setReceiverVpa(e.target.value)} className="w-full bg-slate-900/60 border border-white/10 text-white p-2 rounded-lg text-sm focus:border-blue-500 outline-none transition">
                                        <option>bob@demo</option>
                                        <option>carol@demo</option>
                                        <option>alice@demo</option>
                                        <option>dave@demo</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Amount (₹)</label>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900/60 border border-white/10 text-white p-2 rounded-lg text-sm focus:border-blue-500 outline-none transition" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">PIN</label>
                                    <input type="text" value={pin} onChange={e => setPin(e.target.value)} maxLength="4" className="w-full bg-slate-900/60 border border-white/10 text-white p-2 rounded-lg text-sm focus:border-blue-500 outline-none transition" />
                                </div>
                            </div>
                            <button onClick={handleSend} className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 transition-transform text-white font-semibold py-2 px-4 rounded-lg">📤 Inject into Mesh</button>
                        </div>

                        <div className="mb-6">
                            <div className="font-semibold mb-2">2. Simulate Bluetooth</div>
                            <button onClick={handleGossip} className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-transform text-white font-semibold py-2 px-4 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">🔄 Run Gossip Round</button>
                        </div>

                        <div className="mb-6">
                            <div className="font-semibold mb-2">3. Settle Online</div>
                            <button onClick={handleFlush} className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-transform text-white font-semibold py-2 px-4 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">📡 Bridges Upload to Server</button>
                        </div>

                        <hr className="border-white/10 my-4" />
                        <button onClick={handleReset} className="w-full bg-red-500 hover:bg-red-600 active:scale-95 transition-transform text-white font-semibold py-2 px-4 rounded-lg">🗑 Reset Mesh + Cache</button>
                    </div>

                    <div className="bg-slate-800/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg transition hover:shadow-xl">
                        <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-white/10 text-white">🪵 Activity Log</h2>
                        <div className="bg-slate-950 border border-white/10 rounded-xl p-4 font-mono text-sm text-emerald-400 h-[250px] overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i} className="mb-2 pb-1 border-b border-white/5 leading-relaxed">
                                    <span className="text-slate-500 mr-2">[{log.time}]</span>
                                    <span>{log.msg}</span>
                                </div>
                            ))}
                            {logs.length === 0 && <div className="text-slate-500">No activity yet...</div>}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid gap-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <div className="bg-slate-800/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg transition hover:shadow-xl">
                            <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-white/10 text-white flex justify-between items-center">
                                📱 Mesh Devices
                                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-xs font-semibold">
                                    Cache: {meshState.idempotencyCacheSize}
                                </span>
                            </h2>
                            <div>
                                {meshState.devices.map(d => (
                                    <div key={d.deviceId} className={`border rounded-xl p-4 mb-4 transition ${d.hasInternet ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-slate-900/60 border-white/10'}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <strong className="text-lg">{d.deviceId}</strong>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${d.hasInternet ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-400/20 text-slate-400'}`}>
                                                {d.hasInternet ? '🌐 4G Bridge' : '🚫 Offline'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            Holding {d.packetCount} packet(s)
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {d.packetIds.map(id => (
                                                <span key={id} className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-xs font-mono">{id.substring(0,8)}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-800/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg transition hover:shadow-xl">
                            <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-white/10 text-white">🏦 Account Balances</h2>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">VPA</th>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">Holder</th>
                                        <th className="text-right text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(a => (
                                        <tr key={a.id} className="last:border-0 border-b border-white/10 hover:bg-white/5 transition">
                                            <td className="p-3 font-medium">{a.vpa}</td>
                                            <td className="p-3 text-slate-400">{a.holderName}</td>
                                            <td className="p-3 text-right text-emerald-400 font-mono text-base font-bold">
                                                ₹{parseFloat(a.balance).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-slate-800/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg transition hover:shadow-xl">
                        <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-white/10 text-white">📜 Transaction Ledger</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">ID</th>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">From</th>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">To</th>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">Amount</th>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">Status</th>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">Bridge</th>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">Hops</th>
                                        <th className="text-left text-slate-400 font-medium uppercase text-xs tracking-wider p-3 border-b border-white/10">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id} className="last:border-0 border-b border-white/10 hover:bg-white/5 transition">
                                            <td className="p-3 font-mono">{t.id}</td>
                                            <td className="p-3">{t.senderVpa}</td>
                                            <td className="p-3">{t.receiverVpa}</td>
                                            <td className="p-3 font-mono font-bold text-white">₹{parseFloat(t.amount).toFixed(2)}</td>
                                            <td className={`p-3 font-semibold ${t.status === 'SETTLED' ? 'text-emerald-400' : t.status === 'REJECTED' || t.status === 'INVALID' ? 'text-red-400' : 'text-amber-400'}`}>
                                                {t.status === 'DUPLICATE_DROPPED' ? 'DUPLICATE' : t.status}
                                            </td>
                                            <td className="p-3 text-slate-400">{t.bridgeNodeId || '-'}</td>
                                            <td className="p-3">{t.hopCount}</td>
                                            <td className="p-3 text-slate-400 text-xs">{new Date(t.settledAt).toLocaleTimeString()}</td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="p-8 text-center text-slate-400">No transactions yet</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
