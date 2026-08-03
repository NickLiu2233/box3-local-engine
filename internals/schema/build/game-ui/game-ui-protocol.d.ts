import { MuProtocolSchema } from '@box-local/mudb/protocol';
import { MuBoolean, MuStruct, MuUTF8 } from '@box-local/mudb/schema';
declare const ResetSchema: MuStruct<{
    running: MuBoolean;
    uiTree: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
        id: import("@box-local/mudb/schema").MuASCII;
        type: import("@box-local/mudb/schema").MuSchema<import("../project/murda-tree").TreeNodeType>;
        name: MuUTF8;
        parentId: import("@box-local/mudb/schema").MuASCII;
        childrenIds: import("@box-local/mudb/schema").MuArray<import("@box-local/mudb/schema").MuASCII>;
        value: import("@box-local/mudb/schema").MuOption<import("@box-local/mudb/schema").MuUnion<{
            screen: MuStruct<{
                enable: MuBoolean;
                layout: import("@box-local/mudb/schema").MuUnion<{
                    none: import("@box-local/mudb/schema").MuVoid;
                    autoLayout: MuStruct<{
                        cellSize: MuStruct<{
                            offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        lineHeightEnabled: MuBoolean;
                        columnWidthEnabled: MuBoolean;
                        startCorner: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutStartCorner>;
                        fillDirection: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutFillDirection>;
                        maxCells: import("@box-local/mudb/schema").MuVarint;
                        maxCellsEnabled: MuBoolean;
                        cellPadding: MuStruct<{
                            offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                            ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                        }>;
                        horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                        verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                    }>;
                }>;
                zIndex: import("@box-local/mudb/schema").MuVarint;
            }>;
            element: import("@box-local/mudb/schema").MuUnion<{
                box: MuStruct<{
                    anchor: import("../utils/quantized-schema").QuantizedVec2Schema;
                    position: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    size: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    autoResize: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoResizeType>;
                    visible: MuBoolean;
                    backgroundColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    zIndex: import("@box-local/mudb/schema").MuVarint;
                    layoutOrder: import("@box-local/mudb/schema").MuVarint;
                    layout: import("@box-local/mudb/schema").MuUnion<{
                        none: import("@box-local/mudb/schema").MuVoid;
                        autoLayout: MuStruct<{
                            cellSize: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            lineHeightEnabled: MuBoolean;
                            columnWidthEnabled: MuBoolean;
                            startCorner: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutStartCorner>;
                            fillDirection: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutFillDirection>;
                            maxCells: import("@box-local/mudb/schema").MuVarint;
                            maxCellsEnabled: MuBoolean;
                            cellPadding: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                            verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                        }>;
                    }>;
                    clipsDescendants: MuBoolean;
                    rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                }>;
                image: MuStruct<{
                    anchor: import("../utils/quantized-schema").QuantizedVec2Schema;
                    position: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    size: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    autoResize: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoResizeType>;
                    visible: MuBoolean;
                    backgroundColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    zIndex: import("@box-local/mudb/schema").MuVarint;
                    layoutOrder: import("@box-local/mudb/schema").MuVarint;
                    clipsDescendants: MuBoolean;
                    layout: import("@box-local/mudb/schema").MuUnion<{
                        none: import("@box-local/mudb/schema").MuVoid;
                        autoLayout: MuStruct<{
                            cellSize: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            lineHeightEnabled: MuBoolean;
                            columnWidthEnabled: MuBoolean;
                            startCorner: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutStartCorner>;
                            fillDirection: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutFillDirection>;
                            maxCells: import("@box-local/mudb/schema").MuVarint;
                            maxCellsEnabled: MuBoolean;
                            cellPadding: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                            verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                        }>;
                    }>;
                    image: MuUTF8;
                    imageOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    imageDisplayMode: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").ImageDisplayMode>;
                    rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                }>;
                text: MuStruct<{
                    richText: MuBoolean;
                    rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                    textStrokeColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    textStrokeOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    textStrokeThickness: import("@box-local/mudb/schema").MuQuantizedFloat;
                    textFontFamily: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").UITextFontFamily>;
                    anchor: import("../utils/quantized-schema").QuantizedVec2Schema;
                    position: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    size: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    autoResize: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoResizeType>;
                    visible: MuBoolean;
                    backgroundColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    zIndex: import("@box-local/mudb/schema").MuVarint;
                    layoutOrder: import("@box-local/mudb/schema").MuVarint;
                    layout: import("@box-local/mudb/schema").MuUnion<{
                        none: import("@box-local/mudb/schema").MuVoid;
                        autoLayout: MuStruct<{
                            cellSize: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            lineHeightEnabled: MuBoolean;
                            columnWidthEnabled: MuBoolean;
                            startCorner: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutStartCorner>;
                            fillDirection: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutFillDirection>;
                            maxCells: import("@box-local/mudb/schema").MuVarint;
                            maxCellsEnabled: MuBoolean;
                            cellPadding: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                            verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                        }>;
                    }>;
                    clipsDescendants: MuBoolean;
                    textContent: MuUTF8;
                    textFontSize: import("@box-local/mudb/schema").MuUint8;
                    textColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    textOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    textXAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").TextXAlignType>;
                    textYAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").TextYAlignType>;
                    textLineHeight: import("@box-local/mudb/schema").MuQuantizedFloat;
                    autoWordWrap: MuBoolean;
                }>;
                scrollBox: MuStruct<{
                    anchor: import("../utils/quantized-schema").QuantizedVec2Schema;
                    position: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    size: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    autoResize: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoResizeType>;
                    visible: MuBoolean;
                    backgroundColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    zIndex: import("@box-local/mudb/schema").MuVarint;
                    layoutOrder: import("@box-local/mudb/schema").MuVarint;
                    clipsDescendants: MuBoolean;
                    layout: import("@box-local/mudb/schema").MuUnion<{
                        none: import("@box-local/mudb/schema").MuVoid;
                        autoLayout: MuStruct<{
                            cellSize: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            lineHeightEnabled: MuBoolean;
                            columnWidthEnabled: MuBoolean;
                            startCorner: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutStartCorner>;
                            fillDirection: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutFillDirection>;
                            maxCells: import("@box-local/mudb/schema").MuVarint;
                            maxCellsEnabled: MuBoolean;
                            cellPadding: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                            verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                        }>;
                    }>;
                    scrollDirection: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").UIScrollDirection>;
                    scrollbarHorizontal: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").UIScrollbarHorizontal>;
                    scrollbarVertical: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").UIScrollbarVertical>;
                    scrollbarVisibility: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").UIScrollbarVisibility>;
                    scrollbarThickness: import("@box-local/mudb/schema").MuVarint;
                    scrollbarColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    scrollbarOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    scrollCanvasAutoResize: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoResizeType>;
                    scrollCanvasSize: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    scrollPosition: import("../utils/quantized-schema").QuantizedVec2Schema;
                    rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                }>;
                input: MuStruct<{
                    textStrokeColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    textStrokeOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    textStrokeThickness: import("@box-local/mudb/schema").MuQuantizedFloat;
                    textFontFamily: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").UITextFontFamily>;
                    anchor: import("../utils/quantized-schema").QuantizedVec2Schema;
                    position: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    size: MuStruct<{
                        offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                        ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                    }>;
                    autoResize: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoResizeType>;
                    visible: MuBoolean;
                    backgroundColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    backgroundOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    zIndex: import("@box-local/mudb/schema").MuVarint;
                    layoutOrder: import("@box-local/mudb/schema").MuVarint;
                    layout: import("@box-local/mudb/schema").MuUnion<{
                        none: import("@box-local/mudb/schema").MuVoid;
                        autoLayout: MuStruct<{
                            cellSize: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            lineHeightEnabled: MuBoolean;
                            columnWidthEnabled: MuBoolean;
                            startCorner: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutStartCorner>;
                            fillDirection: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutFillDirection>;
                            maxCells: import("@box-local/mudb/schema").MuVarint;
                            maxCellsEnabled: MuBoolean;
                            cellPadding: MuStruct<{
                                offset: import("../utils/quantized-schema").QuantizedVec2Schema;
                                ratio: import("../utils/quantized-schema").QuantizedVec2Schema;
                            }>;
                            horizontalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutHorizontalAlignType>;
                            verticalAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").AutoLayoutVerticalAlignType>;
                        }>;
                    }>;
                    clipsDescendants: MuBoolean;
                    textContent: MuUTF8;
                    textFontSize: import("@box-local/mudb/schema").MuUint8;
                    textColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    textOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    textXAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").TextXAlignType>;
                    textYAlignment: import("@box-local/mudb/schema").MuSchema<import("../project/ui-rda/defs").TextYAlignType>;
                    textLineHeight: import("@box-local/mudb/schema").MuQuantizedFloat;
                    autoWordWrap: MuBoolean;
                    placeholder: MuUTF8;
                    placeholderColor: import("../utils/quantized-schema").QuantizedVec3Schema;
                    placeholderOpacity: import("@box-local/mudb/schema").MuQuantizedFloat;
                    rotation: import("@box-local/mudb/schema").MuQuantizedFloat;
                }>;
            }>;
        }>>;
    }>>;
    pictureAssets: import("@box-local/mudb/schema").MuDictionary<MuStruct<{
        metadataHash: import("@box-local/mudb/schema").MuASCII;
        hash: import("@box-local/mudb/schema").MuASCII;
        width: import("@box-local/mudb/schema").MuInt32;
        height: import("@box-local/mudb/schema").MuInt32;
    }>>;
    defaultScreenId: MuUTF8;
}>;
export declare const GameUIProtocol: MuProtocolSchema<{
    reset: typeof ResetSchema;
}, {}>;
export {};
//# sourceMappingURL=game-ui-protocol.d.ts.map