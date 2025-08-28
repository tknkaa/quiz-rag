import requests
from bs4 import BeautifulSoup


def scrape_text(url: str) -> str:
    res = requests.get(url)
    html = res.text
    soup = BeautifulSoup(html, "html.parser")
    text = soup.getText()
    return text


if __name__ == "__main__":
    result = scrape_text("https://learn.utcode.net/docs/web-servers/linux-commands")
    print(result)
