import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/api';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function JournalEntryScreen({ route, navigation }) {
  const { schemaId, journalId } = route.params || {};
  const queryClient = useQueryClient();
  const isEditing = !!journalId;

  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Fetch journal if editing
  const { data: journal, isLoading: journalLoading } = useQuery({
    queryKey: ['journal', journalId],
    queryFn: async () => {
      const { data } = await api.get(`/journals/${journalId}`);
      return data.data;
    },
    enabled: isEditing,
  });

  const activeSchemaId = isEditing
    ? (journal?.schemaId?._id || journal?.schemaId || schemaId)
    : schemaId;

  const isReadOnly = !!journal && ['Submitted', 'Verified', 'Locked'].includes(journal.status);

  // Fetch schema structure
  const { data: schema, isLoading: schemaLoading } = useQuery({
    queryKey: ['schema', activeSchemaId],
    queryFn: async () => {
      const { data } = await api.get(`/schemas/${activeSchemaId}`);
      return data.data;
    },
    enabled: !!activeSchemaId,
  });

  // Initialize form data when journal loads
  useEffect(() => {
    if (journal && schema) {
      const initialData = {};
      const journalEntries = journal.entries || journal.data || {};
      schema.tables.forEach((table) => {
        const tableData = journalEntries[table.tableName];
        if (table.isMultiRow) {
          if (Array.isArray(tableData)) {
            initialData[table.tableName] = tableData;
          } else if (tableData && typeof tableData === 'object') {
            initialData[table.tableName] = [tableData];
          } else {
            initialData[table.tableName] = [];
          }
        } else {
          initialData[table.tableName] = tableData || {};
        }
      });
      setFormData(initialData);
    } else if (schema) {
      const initialData = {};
      schema.tables.forEach((table) => {
        initialData[table.tableName] = table.isMultiRow ? [] : {};
      });
      setFormData(initialData);
    }
  }, [journal, schema]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ data, status }) => {
      const payload = {
        schemaId: activeSchemaId,
        entries: data,
        status,
      };

      if (isEditing) {
        const response = await api.put(`/journals/${journalId}`, payload);
        return response.data;
      } else {
        const response = await api.post('/journals', payload);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['journals']);
      queryClient.invalidateQueries(['journal', journalId]);
      Alert.alert('Thành công', 'Nhật ký đã được lưu!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu nhật ký');
    },
  });

  const validateRequiredFields = () => {
    if (!schema?.tables) return [];

    const errors = [];
    schema.tables.forEach((table) => {
      const tableData = formData[table.tableName];
      const rows = table.isMultiRow ? (Array.isArray(tableData) ? tableData : []) : [tableData || {}];

      if (table.isMultiRow && rows.length === 0 && table.fields?.some((field) => field.required)) {
        errors.push(`${table.tableName}: cáº§n thÃªm Ã­t nháº¥t má»™t dÃ²ng dá»¯ liá»‡u`);
        return;
      }

      rows.forEach((row, rowIndex) => {
        table.fields?.forEach((field) => {
          const value = row?.[field.name];
          const isEmpty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
          if (!isEmpty && field.type === 'number' && Number.isNaN(Number(String(value).replace(',', '.')))) {
            const rowLabel = table.isMultiRow ? ` - dòng ${rowIndex + 1}` : '';
            errors.push(`${table.tableName}${rowLabel}: ${field.label} phải là số hợp lệ`);
          }

          if (!isEmpty && field.type === 'date' && Number.isNaN(parseDateString(value).getTime())) {
            const rowLabel = table.isMultiRow ? ` - dòng ${rowIndex + 1}` : '';
            errors.push(`${table.tableName}${rowLabel}: ${field.label} phải là ngày hợp lệ`);
          }

          if (field.required && isEmpty) {
            const rowLabel = table.isMultiRow ? ` - dÃ²ng ${rowIndex + 1}` : '';
            errors.push(`${table.tableName}${rowLabel}: ${field.label} lÃ  báº¯t buá»™c`);
          }
        });
      });
    });

    return errors;
  };

  const handleSave = (status = 'Draft') => {
    if (isReadOnly) {
      Alert.alert('Chá»‰ xem', 'Nháº­t kÃ½ Ä‘Ã£ gá»­i duyá»‡t hoáº·c Ä‘Ã£ khÃ³a, khÃ´ng thá»ƒ chá»‰nh sá»­a.');
      return;
    }

    if (status === 'Submitted') {
      const errors = validateRequiredFields();
      if (errors.length > 0) {
        Alert.alert('Thiáº¿u thÃ´ng tin', errors.slice(0, 6).join('\n'));
        return;
      }
    }

    setIsSaving(true);
    saveMutation.mutate({ data: formData, status }, {
      onSettled: () => setIsSaving(false),
    });
  };

  const getPlaceholderText = (field) => {
    const fieldType = field.type; // Changed from field.fieldType
    const label = field.label.toLowerCase();
    
    switch (fieldType) {
      case 'text':
        if (label.includes('tên')) return `Ví dụ: ${field.label} ABC`;
        if (label.includes('địa chỉ')) return 'Ví dụ: 123 Đường ABC, Phường XYZ';
        if (label.includes('mã')) return 'Ví dụ: ABC123';
        if (label.includes('loại')) return `Chọn loại ${label}`;
        return `Nhập ${label}...`;
        
      case 'number':
        if (label.includes('số lượng')) return 'Ví dụ: 100';
        if (label.includes('diện tích')) return 'Ví dụ: 1000 (m²)';
        if (label.includes('khối lượng') || label.includes('trọng lượng')) return 'Ví dụ: 50 (kg)';
        if (label.includes('giá') || label.includes('tiền')) return 'Ví dụ: 100000 (VNĐ)';
        if (label.includes('nhiệt độ')) return 'Ví dụ: 25 (°C)';
        if (label.includes('độ ẩm')) return 'Ví dụ: 80 (%)';
        if (label.includes('ph')) return 'Ví dụ: 6.5';
        return `Nhập ${label}...`;
        
      case 'textarea':
        if (label.includes('mô tả')) return `Mô tả chi tiết về ${label.replace('mô tả', '').trim()}...`;
        if (label.includes('ghi chú')) return 'Ghi chú thêm thông tin (nếu có)...';
        if (label.includes('nhận xét')) return 'Nhận xét về tình trạng, chất lượng...';
        return `Nhập ${label} chi tiết...`;
        
      case 'date':
        return 'Chọn ngày (DD/MM/YYYY)';
        
      default:
        return `Nhập ${label}...`;
    }
  };

  const normalizeFieldValue = (field, value) => {
    if (field.type === 'number') {
      if (value === '') return '';
      const numericValue = Number(value.replace?.(',', '.') ?? value);
      return Number.isNaN(numericValue) ? value : numericValue;
    }
    if (field.type === 'date' && value instanceof Date) {
      return value.toISOString();
    }
    return value;
  };

  const handleFieldChange = (tableName, fieldName, value, rowIndex = null, field = {}) => {
    const normalizedValue = normalizeFieldValue(field, value);

    setFormData((prev) => {
      if (rowIndex !== null) {
        const rows = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
        rows[rowIndex] = {
          ...(rows[rowIndex] || {}),
          [fieldName]: normalizedValue,
        };
        return { ...prev, [tableName]: rows };
      }

      return {
        ...prev,
        [tableName]: {
          ...prev[tableName],
          [fieldName]: normalizedValue,
        },
      };
    });
  };

  const handleAddRow = (tableName) => {
    setFormData((prev) => ({
      ...prev,
      [tableName]: [...(Array.isArray(prev[tableName]) ? prev[tableName] : []), {}],
    }));
  };

  const handleRemoveRow = (tableName, rowIndex) => {
    setFormData((prev) => ({
      ...prev,
      [tableName]: (Array.isArray(prev[tableName]) ? prev[tableName] : []).filter((_, index) => index !== rowIndex),
    }));
  };

  const openDatePicker = (tableName, fieldName, rowIndex = null, field = {}) => {
    setCurrentDateField({ tableName, fieldName, rowIndex, field });
    const existingValue = rowIndex !== null
      ? formData[tableName]?.[rowIndex]?.[fieldName]
      : formData[tableName]?.[fieldName];
    setCalendarMonth(parseDateString(existingValue));
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
    setCurrentDateField(null);
  };

  const getCurrentDatePickerValue = () => {
    if (!currentDateField) return new Date();
    return parseDateString(
      currentDateField.rowIndex !== null
        ? formData[currentDateField.tableName]?.[currentDateField.rowIndex]?.[currentDateField.fieldName]
        : formData[currentDateField.tableName]?.[currentDateField.fieldName]
    );
  };

  const changeCalendarMonth = (direction) => {
    setCalendarMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + direction);
      return next;
    });
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmpty = (firstDay.getDay() + 6) % 7;
    const cells = Array.from({ length: leadingEmpty }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const isSameDate = (a, b) => (
    a && b
    && a.getDate() === b.getDate()
    && a.getMonth() === b.getMonth()
    && a.getFullYear() === b.getFullYear()
  );

  const selectCalendarDate = (date) => {
    if (!date || !currentDateField) return;
    const { tableName, fieldName, rowIndex, field } = currentDateField;
    handleFieldChange(tableName, fieldName, date, rowIndex, field);
    closeDatePicker();
  };

  const parseDateString = (dateStr) => {
    if (!dateStr) return new Date();
    const isoDate = new Date(dateStr);
    if (!Number.isNaN(isoDate.getTime())) return isoDate;
    // Parse DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  const formatDateValue = (dateStr) => {
    if (!dateStr) return '';
    const date = parseDateString(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN');
  };

  const renderField = (field, tableName, rowIndex = null) => {
    const tableData = formData[tableName];
    const rowData = rowIndex !== null ? tableData?.[rowIndex] : tableData;
    const value = rowData?.[field.name] ?? ''; // Changed from field.fieldName

    switch (field.type) { // Changed from field.fieldType
      case 'text':
      case 'number':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={styles.input}
              value={String(value)}
              onChangeText={(text) => handleFieldChange(tableName, field.name, text, rowIndex, field)}
              placeholder={getPlaceholderText(field)}
              placeholderTextColor="#9ca3af"
              keyboardType={field.type === 'number' ? 'numeric' : 'default'}
              editable={!isReadOnly}
            />
          </View>
        );

      case 'textarea':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={String(value)}
              onChangeText={(text) => handleFieldChange(tableName, field.name, text, rowIndex, field)}
              placeholder={getPlaceholderText(field)}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              editable={!isReadOnly}
            />
          </View>
        );

      case 'select':
      case 'multi-select':
      case 'boolean':
        {
          const options = field.type === 'boolean' ? [
            { label: 'CÃ³', value: true },
            { label: 'KhÃ´ng', value: false },
          ] : (field.options || []).map((option) => ({ label: option, value: option }));
          const selectedValues = Array.isArray(value) ? value : [];

          const handleSelectValue = (optionValue) => {
            if (isReadOnly) return;
            if (field.type === 'multi-select') {
              const nextValue = selectedValues.includes(optionValue)
                ? selectedValues.filter((item) => item !== optionValue)
                : [...selectedValues, optionValue];
              handleFieldChange(tableName, field.name, nextValue, rowIndex, field);
              return;
            }
            handleFieldChange(tableName, field.name, optionValue, rowIndex, field);
          };

          return (
            <View key={field.name} style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                {field.label}
                {field.required && <Text style={styles.required}> *</Text>}
              </Text>
              <View style={styles.selectContainer}>
                {options.map((option) => {
                  const active = field.type === 'multi-select'
                    ? selectedValues.includes(option.value)
                    : value === option.value;
                  return (
                    <TouchableOpacity
                      key={String(option.value)}
                      style={[
                        styles.selectOption,
                        active && styles.selectOptionActive,
                        isReadOnly && styles.disabledOption,
                      ]}
                      onPress={() => handleSelectValue(option.value)}
                      disabled={isReadOnly}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          active && styles.selectOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }

      case 'signature':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.signatureBox}>
              <Feather name="edit-3" size={18} color="#94a3b8" />
              <Text style={styles.signatureText}>
                {value ? 'ÄÃ£ cÃ³ chá»¯ kÃ½' : 'TrÆ°á»ng chá»¯ kÃ½ chá»‰ hiá»ƒn thá»‹ trÃªn mobile'}
              </Text>
            </View>
          </View>
        );

      case 'date':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => !isReadOnly && openDatePicker(tableName, field.name, rowIndex, field)}
              disabled={isReadOnly}
            >
              <Feather name="calendar" size={20} color="#6b7280" />
              <Text style={[styles.dateButtonText, value && styles.dateButtonTextFilled]}>
                {formatDateValue(value) || getPlaceholderText(field)}
              </Text>
            </TouchableOpacity>
            {value && !isReadOnly && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => handleFieldChange(tableName, field.name, '', rowIndex, field)}
              >
                <Feather name="x" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (schemaLoading || journalLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!schema) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Không tìm thấy biểu mẫu</Text>
      </View>
    );
  }

  const currentTable = schema.tables[activeTab];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isEditing ? 'Sửa nhật ký' : 'Tạo nhật ký mới'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {schema.name}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {schema.tables.map((table, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.tab, activeTab === index && styles.tabActive]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>
              {table.tableName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Form Content */}
      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
        {currentTable && currentTable.fields && currentTable.fields.length > 0 ? (
          currentTable.isMultiRow ? (
            <View>
              {(Array.isArray(formData[currentTable.tableName]) ? formData[currentTable.tableName] : []).map((_, rowIndex) => (
                <View key={`${currentTable.tableName}-${rowIndex}`} style={styles.rowCard}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowTitle}>DÃ²ng #{rowIndex + 1}</Text>
                    {!isReadOnly && (
                      <TouchableOpacity onPress={() => handleRemoveRow(currentTable.tableName, rowIndex)} style={styles.removeRowButton}>
                        <Feather name="trash-2" size={16} color="#ef4444" />
                        <Text style={styles.removeRowText}>XÃ³a</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {currentTable.fields.map((field) => renderField(field, currentTable.tableName, rowIndex))}
                </View>
              ))}
              {!isReadOnly && (
                <TouchableOpacity style={styles.addRowButton} onPress={() => handleAddRow(currentTable.tableName)}>
                  <Feather name="plus" size={18} color="#16a34a" />
                  <Text style={styles.addRowText}>ThÃªm dÃ²ng má»›i</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            currentTable.fields.map((field) => renderField(field, currentTable.tableName))
          )
        ) : (
          <View style={styles.emptyFields}>
            <Feather name="inbox" size={48} color="#cbd5e1" />
            <Text style={styles.emptyFieldsText}>Không có trường dữ liệu nào</Text>
            <Text style={styles.emptyFieldsSubtext}>
              {currentTable ? `Table: ${currentTable.tableName}` : 'No table selected'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {!isReadOnly && <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => handleSave('Draft')}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#6b7280" />
          ) : (
            <>
              <Feather name="save" size={20} color="#6b7280" />
              <Text style={styles.buttonSecondaryText}>Lưu nháp</Text>
            </>
          )}
        </TouchableOpacity>}

        {!isReadOnly && <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => handleSave('Submitted')}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="send" size={20} color="#fff" />
              <Text style={styles.buttonPrimaryText}>Gửi duyệt</Text>
            </>
          )}
        </TouchableOpacity>}

        {isReadOnly && (
          <View style={styles.readOnlyBar}>
            <Feather name="lock" size={18} color="#92400e" />
            <Text style={styles.readOnlyText}>Nháº­t kÃ½ Ä‘ang á»Ÿ tráº¡ng thÃ¡i chá»‰ xem</Text>
          </View>
        )}
      </View>

      {/* Date Picker */}
      {showDatePicker && currentDateField && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={closeDatePicker}
        >
          <View style={styles.dateModalOverlay}>
            <View style={styles.dateModalSheet}>
              <View style={styles.dateModalHeader}>
                <TouchableOpacity onPress={closeDatePicker} style={styles.dateModalAction}>
                  <Text style={styles.dateModalCancel}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.dateModalTitle}>Chọn ngày</Text>
                <TouchableOpacity onPress={closeDatePicker} style={styles.dateModalAction}>
                  <Text style={styles.dateModalDone}>Xong</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeCalendarMonth(-1)} style={styles.calendarArrow}>
                  <Feather name="chevron-left" size={22} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.calendarMonthText}>
                  Tháng {calendarMonth.getMonth() + 1}/{calendarMonth.getFullYear()}
                </Text>
                <TouchableOpacity onPress={() => changeCalendarMonth(1)} style={styles.calendarArrow}>
                  <Feather name="chevron-right" size={22} color="#1f2937" />
                </TouchableOpacity>
              </View>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((day) => (
                  <Text key={day} style={styles.weekdayText}>{day}</Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {getCalendarDays().map((date, index) => {
                  const selected = isSameDate(date, getCurrentDatePickerValue());
                  const today = isSameDate(date, new Date());
                  return (
                    <TouchableOpacity
                      key={date ? date.toISOString() : `empty-${index}`}
                      style={[
                        styles.calendarDay,
                        selected && styles.calendarDaySelected,
                        today && !selected && styles.calendarDayToday,
                      ]}
                      disabled={!date}
                      onPress={() => selectCalendarDate(date)}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        selected && styles.calendarDayTextSelected,
                        !date && styles.calendarDayTextEmpty,
                      ]}>
                        {date ? date.getDate() : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    maxHeight: 60,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
  tabActive: {
    backgroundColor: '#22c55e',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectOptionActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectOptionTextActive: {
    color: '#16a34a',
  },
  disabledOption: {
    opacity: 0.6,
  },
  dateButton: {
    minHeight: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#9ca3af',
  },
  dateButtonTextFilled: {
    color: '#1f2937',
  },
  clearDateButton: {
    position: 'absolute',
    right: 12,
    top: 35,
    padding: 8,
  },
  signatureBox: {
    minHeight: 50,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signatureText: {
    flex: 1,
    color: '#64748b',
    fontSize: 14,
  },
  rowCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  removeRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  removeRowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  addRowText: {
    color: '#16a34a',
    fontWeight: '700',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  buttonPrimary: {
    backgroundColor: '#22c55e',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  readOnlyBar: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  readOnlyText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyFields: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyFieldsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyFieldsSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  dateModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  dateModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  dateModalHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dateModalAction: {
    minWidth: 58,
    minHeight: 42,
    justifyContent: 'center',
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  dateModalCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  dateModalDone: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22c55e',
    textAlign: 'right',
  },
  calendarHeader: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1f2937',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarDaySelected: {
    backgroundColor: '#22c55e',
    borderRadius: 21,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 21,
  },
  calendarDayText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  calendarDayTextSelected: {
    color: '#fff',
  },
  calendarDayTextEmpty: {
    color: 'transparent',
  },
});
