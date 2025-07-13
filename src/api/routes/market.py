"""Market data API endpoints"""
from datetime import datetime
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.services import PortfolioService
from src.data.models import MorningBrief

router = APIRouter(prefix="/market", tags=["market"])
portfolio_service = PortfolioService()


@router.get("/quotes")
async def get_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols")
):
    """Get real-time quotes for specified symbols"""
    try:
        symbol_list = [s.strip() for s in symbols.split(",")]
        quotes = await portfolio_service.get_quotes(symbol_list)
        return quotes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indices")
async def get_market_indices():
    """Get major market indices"""
    try:
        # Get quotes for major indices
        indices = ["SPY", "QQQ", "DIA", "IWM", "VIX"]
        quotes = await portfolio_service.get_quotes(indices)
        
        return {
            "indices": quotes,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crypto")
async def get_crypto_prices():
    """Get major cryptocurrency prices"""
    try:
        # Get quotes for major crypto
        crypto = ["BTC-USD", "ETH-USD", "SOL-USD", "MATIC-USD"]
        quotes = await portfolio_service.get_quotes(crypto)
        
        return {
            "crypto": quotes,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))