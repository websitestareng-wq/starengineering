import Link from "next/link";

export default function WebsiteFooter() {
  return (
    <footer className="footer">
      <div className="container footerGrid">
        <div>
          <div className="footerBrand">STAR ENGINEERING</div>
          <div className="muted">
            Quality steel, iron, metals, engineering products and construction material support.
          </div>
        </div>

        <div className="footerLinks">
          <Link href="/about">About</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms & Conditions</Link>
        </div>
      </div>

      <div className="container footBottom">
        <span className="muted">
          © {new Date().getFullYear()} STAR Engineering
        </span>
      </div>
    </footer>
  );
}