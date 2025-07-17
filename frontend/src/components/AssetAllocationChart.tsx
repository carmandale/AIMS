import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, 
  BarChart, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  useAssetAllocation, 
  useConcentrationAnalysis, 
  AssetAllocation 
} from '../hooks/use-portfolio';

interface AssetAllocationChartProps {
  userId: string;
  className?: string;
}

type AllocationView = 'asset_class' | 'sector' | 'geography' | 'brokerage';

export const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({
  userId,
  className = ''
}) => {
  const [selectedView, setSelectedView] = useState<AllocationView>('asset_class');
  const [showDetails, setShowDetails] = useState(false);
  
  const { data: allocation, isLoading, error } = useAssetAllocation(userId);
  const { data: concentrationAnalysis } = useConcentrationAnalysis(userId);
  
  const currentData = useMemo(() => {
    if (!allocation) return [];
    
    const data = (() => {
      switch (selectedView) {
        case 'asset_class':
          return allocation.by_asset_class;
        case 'sector':
          return allocation.by_sector;
        case 'geography':
          return allocation.by_geography;
        case 'brokerage':
          return allocation.by_brokerage;
        default:
          return allocation.by_asset_class;
      }
    })();
    
    return Object.entries(data)
      .map(([name, percentage]) => ({ name, percentage }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [allocation, selectedView]);
  
  const getColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-emerald-500',
      'bg-purple-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };
  
  const getColorClass = (index: number) => {
    const colors = [
      'text-blue-400',
      'text-emerald-400',
      'text-purple-400',
      'text-yellow-400',
      'text-red-400',
      'text-pink-400',
      'text-indigo-400',
      'text-orange-400',
      'text-teal-400',
      'text-cyan-400'
    ];
    return colors[index % colors.length];
  };
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  
  const getViewTitle = (view: AllocationView) => {
    switch (view) {
      case 'asset_class':
        return 'Asset Class';
      case 'sector':
        return 'Sector';
      case 'geography':
        return 'Geography';
      case 'brokerage':
        return 'Brokerage';
      default:
        return 'Asset Class';
    }
  };
  
  const getRiskLevel = (risks: any[]) => {
    const highRisk = risks.filter(r => r.severity === 'high').length;
    const mediumRisk = risks.filter(r => r.severity === 'medium').length;
    
    if (highRisk > 0) return { level: 'High', color: 'text-red-400' };
    if (mediumRisk > 0) return { level: 'Medium', color: 'text-yellow-400' };
    return { level: 'Low', color: 'text-green-400' };
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400">Failed to load allocation data</p>
      </div>
    );
  }
  
  if (!allocation) {
    return null;
  }
  
  const riskLevel = getRiskLevel(allocation.concentration_risks);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <PieChart className="w-6 h-6" />
            <span>Asset Allocation</span>
          </h2>
          <div className="flex items-center space-x-2">
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value as AllocationView)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="asset_class">Asset Class</option>
              <option value="sector">Sector</option>
              <option value="geography">Geography</option>
              <option value="brokerage">Brokerage</option>
            </select>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Diversification Score</p>
                <p className="text-2xl font-bold text-white">
                  {allocation.diversification_score?.toFixed(1) || 'N/A'}/100
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Largest Position</p>
                <p className="text-2xl font-bold text-white">
                  {allocation.largest_position_percent?.toFixed(1) || '0'}%
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Risk Level</p>
                <p className={`text-2xl font-bold ${riskLevel.color}`}>
                  {riskLevel.level}
                </p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${riskLevel.color}`} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart Visualization */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              {getViewTitle(selectedView)} Distribution
            </h3>
            
            {/* Simple bar chart representation */}
            <div className="space-y-3">
              {currentData.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{item.name}</span>
                      <span className="text-sm text-slate-400">{formatPercent(item.percentage)}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className={`h-2 rounded-full ${getColor(index)}`}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Detailed Analysis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Analysis</h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span className="text-sm">Details</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Concentration Risks */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Concentration Risks</h4>
              {allocation.concentration_risks.length > 0 ? (
                <div className="space-y-2">
                  {allocation.concentration_risks.slice(0, 3).map((risk: any, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                        risk.severity === 'high' ? 'text-red-400' : 'text-yellow-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          {risk.identifier} - {risk.percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-400">{risk.recommendation}</p>
                      </div>
                    </div>
                  ))}
                  {allocation.concentration_risks.length > 3 && (
                    <p className="text-xs text-slate-400">
                      +{allocation.concentration_risks.length - 3} more risks
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-green-400">No concentration risks detected</p>
              )}
            </div>
            
            {/* Concentration Metrics */}
            {concentrationAnalysis && showDetails && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Concentration Metrics</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400">Effective Positions</p>
                    <p className="text-white font-medium">
                      {concentrationAnalysis.effective_number_of_positions?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Top 5 Concentration</p>
                    <p className="text-white font-medium">
                      {concentrationAnalysis.top_5_concentration ? 
                        formatPercent(concentrationAnalysis.top_5_concentration * 100) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Herfindahl Index</p>
                    <p className="text-white font-medium">
                      {concentrationAnalysis.herfindahl_index?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Concentration Score</p>
                    <p className="text-white font-medium">
                      {concentrationAnalysis.concentration_score?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Recommendations */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Recommendations</h4>
              <div className="space-y-2">
                {allocation.diversification_score && allocation.diversification_score < 60 && (
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 mt-0.5 text-blue-400" />
                    <p className="text-sm text-slate-300">
                      Consider increasing diversification across asset classes
                    </p>
                  </div>
                )}
                {allocation.largest_position_percent && allocation.largest_position_percent > 15 && (
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 mt-0.5 text-blue-400" />
                    <p className="text-sm text-slate-300">
                      Largest position exceeds 15% - consider rebalancing
                    </p>
                  </div>
                )}
                {allocation.concentration_risks.length === 0 && (
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 mt-0.5 text-green-400" />
                    <p className="text-sm text-slate-300">
                      Portfolio shows good diversification
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};