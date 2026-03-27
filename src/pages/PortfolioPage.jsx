import React, { useEffect } from "react";
import PortfolioView from "../components/PortfolioView";
import { usePortfolio } from "../context/PortfolioContext";

export default function PortfolioPage() {
  const { portfolio, loadPublicPortfolio } = usePortfolio();

  useEffect(() => {
    loadPublicPortfolio();
  }, []);

  return (
    <div className="public-page-shell">
      <PortfolioView data={portfolio} />
    </div>
  );
}
