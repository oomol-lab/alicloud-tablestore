import type { PlainBufferCell } from "./plainbuffer";
import { INF_MAX, INF_MIN } from "./const";
import { inferVariantType, VariantType } from "./plainbuffer";

export function fixPlainBufferCellType(cell: PlainBufferCell): PlainBufferCell {
    if (cell.type) {
        return cell;
    }

    if (cell.value === INF_MIN) {
        return { ...cell, type: VariantType.INF_MIN };
    }
    if (cell.value === INF_MAX) {
        return { ...cell, type: VariantType.INF_MAX };
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
