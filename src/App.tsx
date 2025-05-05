import { useCallback, useRef, useState, useMemo } from 'react'; // useMemo をインポート
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
} from 'reactflow';
import type {
  NodeMouseHandler,
} from 'reactflow';

// Node の型定義を更新し、カスタムデータ型を使用
import type { Node, Edge, Connection, BackgroundVariant } from 'reactflow';
import CustomNode from './CustomNode'; // 作成したカスタムノードをインポート
import type { CustomNodeData } from './CustomNode';
import DetailPanel from './DetailPanel'; // DetailPanel をインポート

import 'reactflow/dist/style.css';
import './App.css'; // App.css をインポート (後でスタイル追加)

// state の型からは isDisabled を除く (useMemo で計算するため)
type NodeStateData = Omit<CustomNodeData, 'isDisabled'>;

const initialNodes: Node<NodeStateData>[] = [];
const initialEdges: Edge[] = [];

let id = 0;
const getId = () => `node_${id++}`; // より明確なID生成

// カスタムノードタイプを登録
const nodeTypes = { custom: CustomNode };

// 祖先のチェック状態を再帰的に確認するヘルパー関数
const isAnyAncestorUnchecked = (
  nodeId: string,
  nodes: Node<NodeStateData>[],
  edges: Edge[],
  visited: Set<string> = new Set() // サイクル検出用
): boolean => {
  if (visited.has(nodeId)) {
    return false; // サイクルの一部であり、このパスでは未チェックの祖先は見つからなかった
  }
  visited.add(nodeId);

  const parentNodeIds = edges
    .filter(edge => edge.target === nodeId)
    .map(edge => edge.source);

  if (parentNodeIds.length === 0) {
    return false; // 祖先がいない
  }

  for (const parentId of parentNodeIds) {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) {
      // 親ノードが見つからない場合 (データ不整合の可能性)
      console.warn(`Parent node ${parentId} not found for node ${nodeId}`);
      continue; // または true を返して安全側に倒すことも検討
    }

    // 親がチェックされていない場合
    if (!parentNode.data.checked) {
      return true;
    }

    // 親の祖先を再帰的にチェック
    if (isAnyAncestorUnchecked(parentId, nodes, edges, new Set(visited))) {
      return true;
    }
  }

  return false; // すべての祖先がチェックされている
};


export default function App() {
  // state の型を NodeStateData に変更
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeStateData>(initialNodes); // useNodesState にジェネリクスを指定
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { setViewport, getViewport, project } = useReactFlow(); // getViewport, project を追加
  const fileInputRef = useRef<HTMLInputElement>(null); // ファイル入力用の ref
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null); // 選択中ノードID state

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // updateNodeChecked から制約チェックロジックを削除
  const updateNodeChecked = useCallback((nodeId: string, checked: boolean) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          // isDisabled はここでは扱わない
          return { ...node, data: { ...node.data, checked } };
        }
        return node;
      })
    );
  }, [setNodes]);

  // updateNodeLabel (変更なし、isDisabled は扱わない)
  const updateNodeLabel = useCallback((nodeId: string, label: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, label } };
        }
        return node;
      })
    );
  }, [setNodes]);

  // updateNodeDetails (変更なし、isDisabled は扱わない)
  const updateNodeDetails = useCallback((nodeId: string, details: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, details } };
        }
        return node;
      })
    );
  }, [setNodes]);

  // useMemo で isDisabled を計算 (isAnyAncestorUnchecked を使用)
  const displayedNodes: Node<CustomNodeData>[] = useMemo(() => {
    // Map を使ってノード検索を高速化 (任意)
    // const nodesMap = new Map(nodes.map(n => [n.id, n]));
    return nodes.map(node => {
      // isAnyAncestorUnchecked を呼び出して isDisabled を決定
      const isDisabled = isAnyAncestorUnchecked(node.id, nodes, edges);

      return {
        ...node,
        data: {
          ...node.data,
          isDisabled: isDisabled, // 計算結果を設定
        }
      };
    });
  }, [nodes, edges]); // nodes または edges が変更されたら再計算

  // addNode (isDisabled の計算は不要、state の型に合わせる)
  const addNode = useCallback(() => {
    const newNodeId = getId();
    // 現在のビューポートの中心座標を計算
    const position = project({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
    });

    // state の型 NodeStateData に合わせる
    const newNode: Node<NodeStateData> = { // 型を Node<CustomNodeData> に指定
      id: newNodeId,
      type: 'custom', // カスタムノードタイプを指定
      position, // 計算した中央座標を設定
      data: {
        label: `Node ${newNodeId}`, // ラベルにノードIDを表示
        checked: false, // 初期チェック状態
        details: '', // 初期詳細情報
        onCheckChange: updateNodeChecked, // チェック状態変更ハンドラを渡す
        onLabelChange: updateNodeLabel, // ラベル変更ハンドラを渡す (追加)
       },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, updateNodeChecked, updateNodeLabel, project]); // getViewport, project を依存配列に追加

  // グラフの状態をファイルに保存する関数
  const onSave = useCallback(() => {
    const viewport = getViewport(); // 現在のビューポートを取得
    const flow = {
      // 元の nodes state を使う
      nodes: nodes.map(node => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { onCheckChange, onLabelChange, ...restData } = node.data; // 関数を除外
        return { ...node, data: restData };
      }),
      edges: edges,
      viewport: viewport, // viewport も保存
    };
    const jsonString = JSON.stringify(flow, null, 2); // 整形して出力
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow-state.json'; // デフォルトのファイル名
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // URLを解放
    // alert は不要に
  }, [nodes, edges, getViewport]); // getViewport を依存配列に追加

  // ファイルからグラフの状態を復元する関数
  const onRestore = useCallback(() => {
    // ファイル選択ダイアログを開く
    fileInputRef.current?.click();
  }, []); // 依存配列は空

  // ファイルが選択されたときの処理
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (readEvent) => {
      try {
        const flowString = readEvent.target?.result as string;
        if (flowString) {
          const flow = JSON.parse(flowString);
          // state の型 NodeStateData に合わせる
          const restoredNodes: Node<NodeStateData>[] = flow.nodes.map((node: Node<Omit<CustomNodeData, 'onCheckChange' | 'onLabelChange' | 'isDisabled'>>) => ({
            ...node,
            type: node.type || 'custom',
            data: {
              label: node.data.label || '', // label がない場合のフォールバック
              checked: node.data.checked || false, // checked がない場合のフォールバック
              details: node.data.details || '', // details がない場合のフォールバック
              onCheckChange: updateNodeChecked,
              onLabelChange: updateNodeLabel,
            },
          }));
          setNodes(restoredNodes); // state を更新すれば useMemo が再計算
          setEdges(flow.edges || []); // エッジがない場合も考慮
          if (flow.viewport) {
             setViewport(flow.viewport); // viewport も復元
          } else {
             // viewport がない場合のデフォルト処理 (任意)
             setViewport({ x: 0, y: 0, zoom: 1 });
          }


          // 復元後に最大のノードIDを更新して、IDの重複を防ぐ
          let maxId = -1;
          restoredNodes.forEach((node: Node) => {
            const match = node.id.match(/^node_(\d+)$/);
            if (match && parseInt(match[1], 10) > maxId) {
              maxId = parseInt(match[1], 10);
            }
          });
          id = maxId + 1;
          setSelectedNodeId(null); // 復元後は選択解除
          alert('グラフの状態を復元しました。');

        }
      } catch (error) {
        console.error("Failed to parse flow state file:", error);
        alert('ファイルの読み込みまたは解析に失敗しました。');
      } finally {
        // 同じファイルを再度選択できるように input の値をリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      console.error("Failed to read file");
      alert('ファイルの読み込みに失敗しました。');
      // 同じファイルを再度選択できるように input の値をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);

  }, [setNodes, setEdges, setViewport, updateNodeChecked, updateNodeLabel]); // 依存関係を更新

  // ノードクリック時のハンドラ
  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  // 背景クリック時のハンドラ (パネルを閉じる)
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // 選択中のノードオブジェクトを取得
  const selectedNode = displayedNodes.find(node => node.id === selectedNodeId);

  return (
    // app-container クラスを追加
    <div className="app-container" style={{ width: '100vw', height: '100vh' }}>
      {/* 非表示のファイル入力 */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json" // JSONファイルのみを受け入れる
        onChange={handleFileChange}
      />
      {/* reactflow-wrapper クラスを追加 */}
      <div className="reactflow-wrapper">
        <ReactFlow
          nodes={displayedNodes} // 計算済みのノードを渡す
          edges={edges}
          onNodesChange={onNodesChange} // これは元の nodes state を更新
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes} // カスタムノードタイプを渡す
          onNodeClick={handleNodeClick} // ノードクリックハンドラを追加
          onPaneClick={handlePaneClick} // 背景クリックハンドラを追加
          // fitView は復元時に viewport を設定するため、削除またはコメントアウトしても良い
          // fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={"dots" as BackgroundVariant} gap={12} size={1} />
          {/* 操作ボタンを追加 */}
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 4, display: 'flex', gap: '10px' }}>
            <button onClick={addNode}>Add Node</button>
            <button onClick={onSave}>Save Flow</button>
            <button onClick={onRestore}>Restore Flow</button>
          </div>
        </ReactFlow>
      </div>
      {/* 詳細パネル */}
      {selectedNode && (
        <DetailPanel
          node={selectedNode}
          onDetailsChange={updateNodeDetails} // 詳細更新関数を渡す
        />
      )}
    </div>
  );
}

// App コンポーネントを ReactFlowProvider でラップする必要があるため、
// main.tsx またはこのファイルの呼び出し元で設定します。
// ここでは App コンポーネント自体をエクスポートします。