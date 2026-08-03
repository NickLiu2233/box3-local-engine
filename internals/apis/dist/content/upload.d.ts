import { HttpClient } from '../http-client';
import { RequestParams } from '../interface';
export declare class Upload<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
    /**
     * 上传文件接口
     * @param data
     * @param params
     * @returns
     */
    fileUploadPost: (data: {
        file?: Blob;
        type?: "model" | "script";
    }, params?: RequestParams) => Promise<string>;
}
//# sourceMappingURL=upload.d.ts.map