'use client';

import React, { useEffect } from 'react';
import ReactFlow, { MiniMap, Controls, Background, Node, Edge, useReactFlow, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';

type FlowChartProps = {
  nodes: Node[];
  edges: Edge[];
};

function FlowContent({ nodes, edges }: FlowChartProps) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodes.length > 0) {
      fitView({ duration: 400 });
    }
  }, [nodes, edges, fitView]);

  return (
    <>
      <MiniMap />
      <Controls />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </>
  );
}

export default function FlowChart({ nodes, edges }: FlowChartProps) {
  if (nodes.length === 0) {
    return (
      <div style={{ padding: '2rem', color: '#a0a0a0', textAlign: 'center', border: '1px dashed #444', borderRadius: '8px' }}>
        分析するトランザクションを入力してください。
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '500px', backgroundColor: '#111', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={true}
        fitView
      >
        <FlowContent nodes={nodes} edges={edges} />
      </ReactFlow>
    </div>
  );
}