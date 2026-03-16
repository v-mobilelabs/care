import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

CDSCO_URL = "https://cdsco.gov.in/opencms/opencms/en/Approval_new/Approved-New-Drugs/"
DOWNLOAD_DIR = "scripts/cdsco_pdfs"


def ensure_dir(path: str):
    if not os.path.exists(path):
        os.makedirs(path)


def get_pdf_links():
    resp = requests.get(CDSCO_URL)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().endswith(".pdf") and ("approved" in href.lower() or "drug" in href.lower()):
            # Only get PDFs that look like drug approval lists
            links.append(urljoin(CDSCO_URL, href))
    return links


def download_pdfs(links):
    ensure_dir(DOWNLOAD_DIR)
    for url in links:
        filename = url.split("/")[-1]
        dest = os.path.join(DOWNLOAD_DIR, filename)
        if os.path.exists(dest):
            print(f"Already downloaded: {filename}")
            continue
        print(f"Downloading: {filename}")
        r = requests.get(url, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    print("All PDFs downloaded.")


def main():
    links = get_pdf_links()
    print(f"Found {len(links)} PDF links.")
    download_pdfs(links)


if __name__ == "__main__":
    main()
