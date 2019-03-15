export interface Producer {
    produce: (passData: (data:any) => void) => void;
}