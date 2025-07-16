import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api-client';
import { toast } from 'sonner';

interface TaskTemplate {
  id: number;
  name: string;
  description: string | null;
  rrule: string;
  is_blocking: boolean;
  category: string;
  priority: number;
  estimated_duration: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TaskTemplateCreate {
  name: string;
  description?: string;
  rrule: string;
  is_blocking: boolean;
  category: string;
  priority: number;
  estimated_duration?: number;
}

export const TaskTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [formData, setFormData] = useState<TaskTemplateCreate>({
    name: '',
    description: '',
    rrule: '',
    is_blocking: false,
    category: 'general',
    priority: 1,
    estimated_duration: undefined
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.tasks.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load task templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async () => {
    try {
      await api.tasks.createTemplate(formData);
      toast.success('Task template created successfully');
      setShowCreateForm(false);
      resetForm();
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create task template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    
    try {
      await api.tasks.updateTemplate(editingTemplate.id, formData);
      toast.success('Task template updated successfully');
      setEditingTemplate(null);
      resetForm();
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Failed to update task template');
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this task template?')) return;
    
    try {
      await api.tasks.deleteTemplate(templateId);
      toast.success('Task template deleted successfully');
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete task template');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rrule: '',
      is_blocking: false,
      category: 'general',
      priority: 1,
      estimated_duration: undefined
    });
  };

  const startEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      rrule: template.rrule,
      is_blocking: template.is_blocking,
      category: template.category,
      priority: template.priority,
      estimated_duration: template.estimated_duration || undefined
    });
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setShowCreateForm(false);
    resetForm();
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Unknown';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-400 bg-red-500/20';
      case 2: return 'text-yellow-400 bg-yellow-500/20';
      case 3: return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Task Templates</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {(showCreateForm || editingTemplate) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700"
          >
            <h3 className="text-lg font-medium text-white mb-4">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Task name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="general">General</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Task description"
                  rows={2}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">RRULE Schedule</label>
                <input
                  type="text"
                  value={formData.rrule}
                  onChange={(e) => setFormData({ ...formData, rrule: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use RFC 5545 RRULE format for scheduling
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>High</option>
                  <option value={2}>Medium</option>
                  <option value={3}>Low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.estimated_duration || ''}
                  onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Estimated duration"
                />
              </div>
              
              <div className="md:col-span-2 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.is_blocking}
                    onChange={(e) => setFormData({ ...formData, is_blocking: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  Blocking Task (prevents weekly cycle closure)
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4 inline mr-1" />
                Cancel
              </button>
              <button
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                disabled={!formData.name || !formData.rrule}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 inline mr-1" />
                {editingTemplate ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates List */}
      <div className="space-y-3">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'p-4 rounded-xl border transition-all',
              template.is_active 
                ? 'bg-gray-800/50 border-gray-700' 
                : 'bg-gray-800/20 border-gray-800 opacity-60'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-white">{template.name}</h3>
                  {template.is_blocking && (
                    <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
                      Blocking
                    </span>
                  )}
                  <span className={cn(
                    'px-2 py-0.5 text-xs rounded-full',
                    getPriorityColor(template.priority)
                  )}>
                    {getPriorityLabel(template.priority)}
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                    {template.category}
                  </span>
                  {!template.is_active && (
                    <span className="px-2 py-0.5 text-xs bg-gray-600 text-gray-400 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                
                {template.description && (
                  <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                )}
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Schedule:</strong> {template.rrule}</p>
                  {template.estimated_duration && (
                    <p><strong>Duration:</strong> {template.estimated_duration} minutes</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => startEdit(template)}
                  className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400">No task templates found</p>
          <p className="text-sm text-gray-500 mt-1">Create your first template to get started</p>
        </div>
      )}
    </div>
  );
};