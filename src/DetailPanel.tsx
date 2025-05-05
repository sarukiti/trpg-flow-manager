import React from 'react';
import type { Node } from 'reactflow';
import type { CustomNodeData } from './CustomNode';

interface DetailPanelProps {
  node: Node<CustomNodeData>;
  onDetailsChange: (id: string, details: string) => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ node, onDetailsChange }) => {
  const handleDetailsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onDetailsChange(node.id, event.target.value);
  };

  return (
    <div className="detail-panel">
      <h3>Node Details: {node.data.label}</h3>
      <textarea
        rows={10}
        value={node.data.details}
        onChange={handleDetailsChange}
        placeholder="Enter details here..."
      />
      {/* 必要に応じて他の情報（ID、チェック状態など）も表示 */}
      {/* <p>ID: {node.id}</p> */}
      {/* <p>Checked: {node.data.checked ? 'Yes' : 'No'}</p> */}
    </div>
  );
};

export default DetailPanel;