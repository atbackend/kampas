import requests
import json
import time
import io
from PIL import Image
import numpy as np

def test_s3_upload():
    # Use the hardcoded values from the previous API response
    presigned_url = "https://kampas.s3.amazonaws.com/"
    form_fields = {
        "Content-Type": "image/tiff",
        "key": "NwJniMMBNoJkrdmmqUsUuhFCg/UcXqrPFIZxkEJ6ewE3OlasbCV/raster_layers/ye14qhiu9bjnmbxld3c585kxa.tiff",
        "x-amz-algorithm": "AWS4-HMAC-SHA256",
        "x-amz-credential": "AKIA34AMDFQMHAFAPI3A/20250809/ap-south-1/s3/aws4_request",
        "x-amz-date": "20250809T045658Z",
        "policy": "eyJleHBpcmF0aW9uIjogIjIwMjUtMDgtMDlUMDU6NTY6NThaIiwgImNvbmRpdGlvbnMiOiBbeyJDb250ZW50LVR5cGUiOiAiaW1hZ2UvdGlmZiJ9LCBbImNvbnRlbnQtbGVuZ3RoLXJhbmdlIiwgMSwgMTA3Mzc0MTgyNDAwXSwgeyJidWNrZXQiOiAia2FtcGFzIn0sIHsia2V5IjogIk53Sm5pTU1CTm9Ka3JkbW1xVXNVdWhGQ2cvVWNYcXJQRklaeGtFSjZld0UzT2xhc2JDVi9yYXN0ZXJfbGF5ZXJzL3llMTRxaGl1OWJqbm1ieGxkM2M1ODVreGEudGlmZiJ9LCB7IngtYW16LWFsZ29yaXRobSI6ICJBV1M0LUhNQUMtU0hBMjU2In0sIHsieC1hbXotY3JlZGVudGlhbCI6ICJBS0lBMzRBTURGUU1IQUZBUEkzQS8yMDI1MDgwOS9hcC1zb3V0aC0xL3MzL2F3czRfcmVxdWVzdCJ9LCB7IngtYW16LWRhdGUiOiAiMjAyNTA4MDlUMDQ1NjU4WiJ9XX0=",
        "x-amz-signature": "21c9f849d7c2b0368dfd68d07e8e5b241aae00cd4eea9c8459a8c0525b2eddda"
    }
    task_id = "05b01cf4-1cd7-4df4-9de3-b356f3638206"
    s3_key = "NwJniMMBNoJkrdmmqUsUuhFCg/UcXqrPFIZxkEJ6ewE3OlasbCV/raster_layers/ye14qhiu9bjnmbxld3c585kxa.tiff"
    
    # Create a valid TIFF file with LZW compression
    img_array = np.zeros((100, 100), dtype=np.uint8)
    img = Image.fromarray(img_array)
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='TIFF', compression='lzw')
    img_byte_arr.seek(0)
    file_content = img_byte_arr.getvalue()
    
    # Prepare the files for upload
    files = {'file': ('dummy_test_file.tiff', file_content, 'image/tiff')}
    
    # Upload to S3
    print(f"Uploading file to S3 using presigned URL: {presigned_url}")
    try:
        response = requests.post(presigned_url, data=form_fields, files=files)
        print(f"S3 Upload Status Code: {response.status_code}")
        print(f"S3 Upload Response: {response.text}")
        
        if response.status_code == 204:
            print("✓ File uploaded successfully to S3")
            return True
        else:
            print(f"✗ File upload failed with status code {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error uploading file to S3: {e}")
        return False

if __name__ == "__main__":
    test_s3_upload()