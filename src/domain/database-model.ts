export interface DatabaseSnapshot {
  databaseName: string;
  capturedAt: string;
  schemas: DatabaseSchema[];
  foreignKeys: DatabaseForeignKey[];
}

export interface DatabaseSchema {
  name: string;
  tables: DatabaseTable[];
}

export interface DatabaseTable {
  id: string;
  schema: string;
  name: string;
  kind: "table" | "partitioned-table" | "view" | "materialized-view";
  comment?: string;
  columns: DatabaseColumn[];
}

export interface DatabaseColumn {
  id: string;
  name: string;
  ordinal: number;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
  primaryKey: boolean;
  foreignKey: boolean;
  unique: boolean;
}

export interface DatabaseForeignKey {
  id: string;
  name: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  onDelete: string;
  onUpdate: string;
}
