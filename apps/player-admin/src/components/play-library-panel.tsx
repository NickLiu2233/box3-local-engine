import { Button, Card, Empty, Table } from 'antd';

import type { TableProps } from 'antd';
import type { ReactNode } from 'react';

type PlayLibraryPanelProps<T extends object> = {
    title:string;
    summary:ReactNode;
    items:T[];
    table:Pick<TableProps<T>, 'rowKey' | 'columns' | 'expandable'>;
    emptyDescription:string;
    importLabel:string;
    canManage:boolean;
    onImport:() => void;
};

/** Maps and model previews share the same directory and empty state. */
export function PlayLibraryPanel<T extends object>(props:PlayLibraryPanelProps<T>) {
    const { title, summary, items, table, emptyDescription, importLabel, canManage, onImport } =
        props;
    if (!items.length) {
        return (
            <Card className="player-admin-panel">
                <Empty description={emptyDescription}>
                    {canManage ? (
                        <Button type="primary" onClick={onImport}>
                            {importLabel}
                        </Button>
                    ) : null}
                </Empty>
            </Card>
        );
    }
    return (
        <Card
            className="player-admin-panel player-admin-map-directory"
            title={title}
            extra={<span className="player-admin-muted">{summary}</span>}
        >
            <Table<T>
                {...table}
                className="player-admin-map-table"
                tableLayout="fixed"
                size="middle"
                pagination={false}
                scroll={{ x: 900 }}
                dataSource={items}
            />
        </Card>
    );
}

export function PlayLibraryName({ name, version }:{ name:string; version?:string }) {
    return (
        <div className="player-admin-map-name">
            <span className="player-admin-map-title" title={name}>
                {name}
            </span>
            {version ? (
                <span className="player-admin-map-version">v{version.replace(/^v/i, '')}</span>
            ) : null}
        </div>
    );
}
