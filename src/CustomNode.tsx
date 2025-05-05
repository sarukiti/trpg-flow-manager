import React, { memo, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import type {NodeProps} from 'reactflow';

// ノードデータに details プロパティを追加
export interface CustomNodeData {
  label: string;
  checked: boolean;
  details: string; // 追加
  onCheckChange: (id: string, checked: boolean) => void;
  onLabelChange: (id: string, label: string) => void;
  isDisabled?: boolean; // 追加
}

const CustomNode = memo(({ id, data }: NodeProps<CustomNodeData>) => {
  // チェックボックスの変更ハンドラ
  const handleCheckboxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    data.onCheckChange(id, event.target.checked);
  }, [id, data]);

  // ラベル変更ハンドラ
  const handleLabelChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    data.onLabelChange(id, event.target.value);
  }, [id, data]);

  return (
    <div className="react-flow__node-default">
      <Handle type="target" position={Position.Top} isConnectable={true} />
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px' }}>
        <input
          type="checkbox"
          checked={data.checked}
          onChange={handleCheckboxChange}
          disabled={data.isDisabled} // disabled 属性を追加
          style={{ marginRight: '5px' }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        />
        {/* ラベルを input 要素に変更 */}
        <input
          type="text"
          value={data.label}
          onChange={handleLabelChange}
          className="nodrag" // reactflow がドラッグ操作を無視するようにクラスを追加
          onClick={(event) => event.stopPropagation()} // クリックイベントの伝播も停止
          style={{ border: 'none', background: 'transparent', width: '100%', color: 'black' }} // スタイルに color: 'black' を追加
        />
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={true} />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;