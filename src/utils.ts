import type { PlainBufferCell, VariantType } from "./plainbuffer";
import { inferVariantType } from "./plainbuffer";

export function fixPlainBufferCellType(cell: PlainBufferCell): PlainBufferCell {
    if (cell.type) {
        return cell;
    }

    cell.type = inferVariantType(cell.value).type;
    return cell;
}

export function createPrimaryKey(name: string, value: any, type?: VariantType): PlainBufferCell {
    return fixPlainBufferCellType({
        name,
        value,
        type,
    });
}

export function createAttribute(name: string, value: any, type?: VariantType): PlainBufferCell {
    return fixPlainBufferCellType({
        name,
        value,
        type,
    });
}
