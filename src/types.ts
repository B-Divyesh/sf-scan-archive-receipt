export interface ScanItem {
  id: string;
  order: number;
  originalName: string;
  stableName: string;
  type: string;
  size: number;
  checksum: string;
  sourceItem: string;
  page: string;
  approximateDate: string;
  rights: string;
  notes: string;
  blob: Blob;
}

export interface Batch {
  id: string;
  title: string;
  collection: string;
  physicalSource: string;
  filenamePrefix: string;
  customPattern: string;
  defaultSource: string;
  defaultDate: string;
  defaultRights: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  items: ScanItem[];
}
