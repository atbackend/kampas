import os
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def get_exif_data(image):
    """Extract EXIF data from an image and convert GPS into readable format."""
    exif_data = {}
    info = image._getexif()
    if not info:
        return exif_data

    for tag, value in info.items():
        tagname = TAGS.get(tag, tag)
        if tagname == "GPSInfo":
            gps_data = {}
            for t in value:
                sub_tag = GPSTAGS.get(t, t)
                gps_data[sub_tag] = value[t]
            exif_data["GPSInfo"] = gps_data
        else:
            exif_data[tagname] = value
    return exif_data


def get_decimal_from_dms(dms, ref):
    """Convert GPS coordinates from DMS to decimal format."""
    degrees = dms[0][0] / dms[0][1]
    minutes = dms[1][0] / dms[1][1]
    seconds = dms[2][0] / dms[2][1]

    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal


def extract_metadata(image_path):
    if not os.path.exists(image_path):
        print(f"❌ File not found: {image_path}")
        return

    img = Image.open(image_path)
    exif_data = get_exif_data(img)

    print("\n📸 Extracted Metadata:")
    for key, value in exif_data.items():
        if key == "GPSInfo":
            gps_info = value
            lat = gps_info.get("GPSLatitude")
            lat_ref = gps_info.get("GPSLatitudeRef")
            lon = gps_info.get("GPSLongitude")
            lon_ref = gps_info.get("GPSLongitudeRef")
            alt = gps_info.get("GPSAltitude")

            if lat and lon and lat_ref and lon_ref:
                latitude = get_decimal_from_dms(lat, lat_ref)
                longitude = get_decimal_from_dms(lon, lon_ref)
                print(f"GPS Latitude: {latitude}")
                print(f"GPS Longitude: {longitude}")

            if alt:
                # Altitude can be stored as a tuple (value, ref)
                altitude = alt[0] / alt[1] if isinstance(alt, tuple) else alt
                print(f"GPS Altitude: {altitude} m")
        else:
            print(f"{key}: {value}")


if __name__ == "__main__":
    image_path = input("Enter image file path: ").strip()
    extract_metadata(image_path)
