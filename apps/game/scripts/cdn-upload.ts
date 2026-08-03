import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const folderName = '.next/static';
const staticPath = path.join(process.cwd(), folderName);
const filePrefix = '_next/static';
const start = async () => {
    async function uploadDir(dirPath:string) {
        try {
            const files = await fs.promises.readdir(dirPath, {withFileTypes: true});
            await Promise.all(files.map(async (file) => {
                const filePath = path.join(dirPath, file.name);
                if (file.isDirectory()) {
                    await uploadDir(filePath);
                } else if (file.isFile()) {
                    const cdnFileName = filePrefix + filePath.split(folderName)[1];
                    console.log('Uploading file:', cdnFileName);
                    // 接口上传文件
                    const form = new FormData();
                    form.append('file', fs.createReadStream(filePath));
                    form.append('fileName', cdnFileName);
                    // const result = await axios.post('xxx', form, {
                    //     headers: { ...form.getHeaders() },
                    //     timeout: 20000,
                    // });
                    // if (result.status == 200) {
                    //     console.log(`cdnFileName done`);
                    // }
                }
            }));
        } catch (err) {
            console.error(err);
        }
    }
    console.log('----- start upload files to cdn -----');
    await uploadDir(staticPath);
}

start().catch((e) => {
    console.log(e);
});