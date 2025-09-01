"use client";

import { useState, useEffect } from 'react';
import { createPublicClient, http, Hash, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import FlowChart from '@/components/FlowChart';
import type { Node, Edge } from 'reactflow';

// --- 環境変数の設定 ---
const ALCHEMY_URL = process.env.NEXT_PUBLIC_ALCHEMY_URL;

// --- viemクライアントの初期化 ---
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(ALCHEMY_URL),
});

// --- 型定義 ---
type TxInfo = {
  from: string;
  to: string | null | undefined;
  logsCount: number;
  value: bigint;
  blockNumber: bigint;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
};

export default function Home() {
  // --- State変数の定義 ---
  const [inputHash, setInputHash] = useState<string>('');
  const [targetHash, setTargetHash] = useState<Hash | null>(null);
  const [txInfo, setTxInfo] = useState<TxInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // --- トランザクション取得＆データ変換ロジック ---
  useEffect(() => {
    if (!targetHash) return;

    const fetchAndProcessTransaction = async () => {
      setIsLoading(true);
      setError(null);
      setTxInfo(null);
      setNodes([]);
      setEdges([]);

      if (!ALCHEMY_URL) {
        setError("エラー: AlchemyのURLが設定されていません。");
        setIsLoading(false);
        return;
      }

      try {
        const [transaction, receipt] = await Promise.all([
          publicClient.getTransaction({ hash: targetHash }),
          publicClient.getTransactionReceipt({ hash: targetHash })
        ]);

        if (!receipt || !transaction) {
          setError(`トランザクションの情報が見つかりませんでした。`);
        } else {
          setTxInfo({
            from: receipt.from,
            to: receipt.to,
            logsCount: receipt.logs.length,
            value: transaction.value,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
          });

          const newNodes: Node[] = [];
          const newEdges: Edge[] = [];
          const addressMap = new Map<string, boolean>();

          newNodes.push({ id: receipt.from, position: { x: 50, y: 200 }, data: { label: `From: ${receipt.from.slice(0, 6)}...${receipt.from.slice(-4)}` }, style: { backgroundColor: '#50e3c2', color: 'black' } });
          addressMap.set(receipt.from, true);

          if (receipt.to) {
            newNodes.push({ id: receipt.to, position: { x: 300, y: 200 }, data: { label: `To: ${receipt.to.slice(0, 6)}...${receipt.to.slice(-4)}` } });
            addressMap.set(receipt.to, true);
            newEdges.push({ id: `e-${receipt.from}-${receipt.to}`, source: receipt.from, target: receipt.to, animated: true, style: { strokeWidth: 2 }, label: `${formatEther(transaction.value)} ETH` });
          }

          receipt.logs.forEach((log, index) => {
            if (!addressMap.has(log.address)) {
              newNodes.push({ id: log.address, position: { x: 550, y: 100 + index * 100 }, data: { label: `Contract: ${log.address.slice(0, 6)}...${log.address.slice(-4)}` }, style: { backgroundColor: '#f5a623', color: 'black' } });
              addressMap.set(log.address, true);
            }
            if (receipt.to) {
              newEdges.push({ id: `e-log-${receipt.to}-${log.address}-${index}`, source: receipt.to, target: log.address, label: `Event #${index + 1}` });
            }
          });
          setNodes(newNodes);
          setEdges(newEdges);
        }
      } catch (err: unknown) { // anyをunknownに変更し、型ガードを行う
        console.error("データ取得エラー:", err);
        if (err instanceof Error && 'name' in err && err.name === 'TransactionNotFoundError') {
          setError(`トランザクションが見つかりませんでした。`);
        } else {
          setError("予期せぬエラーが発生しました。");
        }
      } finally {
        setIsLoading(false);
      }
    };  
    fetchAndProcessTransaction();
  }, [targetHash]);

  // --- イベントハンドラ ---
  const handleAnalyse = () => {
    setError(null);
    if (inputHash && /^0x[a-fA-F0-9]{64}$/.test(inputHash)) {
      setTargetHash(inputHash as Hash);
    } else {
      setError("エラー: 正しいトランザクションハッシュの形式ではありません。");
      setTargetHash(null);
      setTxInfo(null);
      setNodes([]);
      setEdges([]);
    }
  };

  const handleReset = () => {
    setInputHash('');
    setTargetHash(null);
    setTxInfo(null);
    setError(null);
    setNodes([]);
    setEdges([]);
    console.log("状態がリセットされました。");
  };

  // --- レンダリング ---
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', color: '#e0e0e0', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#4a90e2' }}>Web3 Sherlock</h1>
        <p style={{ color: '#a0a0a0' }}>トランザクションを可視化し、Web3の透明性を、すべての人へ。</p>
      </header>
      
      <section style={{ backgroundColor: '#2a2a2a', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5rem', marginBottom: '1rem' }}>分析対象</h2>
        <p style={{ color: '#a0a0a0', marginTop: 0, marginBottom: '1rem' }}>
          調査したいトランザクションハッシュを入力してください。
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={inputHash}
            onChange={(e) => setInputHash(e.target.value)}
            placeholder="例: 0x9a8069502281a1a9a854224c328ed338..."
            style={{ width: '100%', padding: '0.8rem', backgroundColor: '#1a1a1a', border: error ? '1px solid #e67e22' : '1px solid #444', borderRadius: '4px', color: '#e0e0e0', fontSize: '1em' }}
          />
          <button
            onClick={handleAnalyse}
            disabled={isLoading || !inputHash}
            style={{ padding: '0.8rem 1.5rem', backgroundColor: (isLoading || !inputHash) ? '#555' : '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: (isLoading || !inputHash) ? 'not-allowed' : 'pointer', fontSize: '1em', whiteSpace: 'nowrap', transition: 'background-color 0.2s' }}
          >
            {isLoading ? '分析中...' : '分析する'}
          </button>
          <button
            onClick={handleReset}
            style={{ padding: '0.8rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em', whiteSpace: 'nowrap', transition: 'background-color 0.2s' }}
          >
            リセット
          </button>
        </div>
      </section>

      {(isLoading || error || txInfo) && (
        <section style={{ backgroundColor: '#2a2a2a', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            {targetHash ? `分析結果 for ${targetHash.slice(0, 6)}...${targetHash.slice(-4)}` : '分析結果'}
          </h2>
          {isLoading && <p>トランザクションデータを取得中...</p>}
          {error && ( <div style={{ color: '#e67e22', padding: '1rem', border: '1px solid #e67e22', borderRadius: '4px' }}><p><strong>エラー</strong></p><p>{error}</p></div> )}
          {!isLoading && !error && txInfo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div><p style={{ color: '#a0a0a0', margin: 0 }}>ブロック番号:</p><p style={{ fontSize: '1.2em', margin: '0.2rem 0', color: 'white' }}><strong>{txInfo.blockNumber.toString()}</strong></p></div>
              <div><p style={{ color: '#a0a0a0', margin: 0 }}>送信元アドレス:</p><p style={{ fontSize: '1.2em', margin: '0.2rem 0', wordWrap: 'break-word', color: '#50e3c2' }}><strong>{txInfo.from}</strong></p></div>
              <div><p style={{ color: '#a0a0a0', margin: 0 }}>送信先アドレス:</p><p style={{ fontSize: '1.2em', margin: '0.2rem 0', wordWrap: 'break-word', color: '#f5a623' }}><strong>{txInfo.to || 'N/A (Contract Creation)'}</strong></p></div>
              <div><p style={{ color: '#a0a0a0', margin: 0 }}>送金額 (ETH):</p><p style={{ fontSize: '1.5em', margin: '0.2rem 0', color: '#87ceeb' }}><strong>{formatEther(txInfo.value)}</strong> ETH</p></div>
              <div><p style={{ color: '#a0a0a0', margin: 0 }}>合計手数料 (概算):</p><p style={{ fontSize: '1.2em', margin: '0.2rem 0', color: '#e67e22' }}><strong>{formatEther(txInfo.gasUsed * txInfo.effectiveGasPrice)}</strong> ETH</p></div>
              <div><p style={{ color: '#a0a0a0', margin: 0 }}>検出されたイベントログの数:</p><p style={{ fontSize: '1.5em', margin: '0.2rem 0', color: '#7ed321' }}><strong>{txInfo.logsCount}</strong> 件</p></div>
            </div>
          )}
        </section>
      )}
      
      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#4a90e2' }}>
          トランザクションフロー
        </h2>
        <FlowChart nodes={nodes} edges={edges} />
      </section>
    </main>
  );
}