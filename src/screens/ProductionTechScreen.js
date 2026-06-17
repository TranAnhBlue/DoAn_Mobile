import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const categories = [
  {
    id: 'trong-trot',
    title: 'Kỹ thuật Trồng trọt',
    icon: 'layers',
    color: '#22c55e',
    bgColor: '#dcfce7',
    docs: [
      {
        title: 'Quy trình sản xuất Lúa theo hướng VietGAP',
        content: '1. Chọn giống: Sử dụng hạt giống cấp xác nhận\n2. Làm đất: Cày bừa kỹ, bón lót\n3. Gieo sạ: Mật độ 100-120kg/ha\n4. Bón phân: Ưu tiên phân hữu cơ, bón theo nguyên tắc 4 đúng\n5. Quản lý dịch hại: Áp dụng IPM',
      },
      {
        title: 'Quy trình canh tác Dưa lưới trong nhà màng',
        content: '1. Chuẩn bị giá thể: Xơ dừa xử lý sạch chát\n2. Gieo hạt: Khay xốp 84 lỗ\n3. Chăm sóc: Tưới nhỏ giọt Drip irrigation\n4. Thu hoạch: Kiểm tra độ Brix >= 12%',
      },
      {
        title: 'Hướng dẫn sử dụng thuốc Bảo vệ thực vật',
        content: 'Tuân thủ nghiêm ngặt nguyên tắc 4 đúng (Đúng thuốc, đúng liều lượng, đúng lúc, đúng cách). Phải đảm bảo thời gian cách ly PHI trước khi thu hoạch.',
      },
    ],
  },
  {
    id: 'chan-nuoi',
    title: 'Kỹ thuật Chăn nuôi',
    icon: 'truck',
    color: '#f97316',
    bgColor: '#ffedd5',
    docs: [
      {
        title: 'Quy trình chăn nuôi Lợn an toàn sinh học (VietGAP)',
        content: '1. Chuồng trại: Cách ly khu dân cư, có hố sát trùng\n2. Con giống: Có nguồn gốc rõ ràng, đã tiêm vacxin\n3. Thức ăn: Không có chất cấm\n4. Vệ sinh: Định kỳ phun thuốc sát trùng tiêu độc',
      },
      {
        title: 'Kỹ thuật nuôi Gà thả vườn an toàn',
        content: 'Tài liệu hướng dẫn mật độ chăn thả, khẩu phần ăn theo từng giai đoạn và lịch tiêm phòng chuẩn cho gia cầm.',
      },
    ],
  },
  {
    id: 'thuy-san',
    title: 'Kỹ thuật Thủy sản',
    icon: 'droplet',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    docs: [
      {
        title: 'Quy phạm nuôi Tôm nước lợ VietGAP',
        content: 'Quản lý chất lượng nước ao nuôi, kiểm soát bùn đáy và kỹ thuật xử lý nước bằng chế phẩm sinh học.',
      },
      {
        title: 'Nuôi cá lồng bè an toàn',
        content: 'Kiểm soát mật độ, chất lượng thức ăn và phòng bệnh ký sinh trùng cho cá lồng.',
      },
    ],
  },
];

export default function ProductionTechScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const renderCategoryCard = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[styles.categoryCard, { borderColor: category.color }]}
      onPress={() => setSelectedCategory(category)}
    >
      <View style={[styles.iconContainer, { backgroundColor: category.bgColor }]}>
        <Feather name={category.icon} size={32} color={category.color} />
      </View>
      <Text style={styles.categoryTitle}>{category.title}</Text>
      <Text style={styles.categorySubtitle}>
        {category.docs.length} tài liệu hướng dẫn
      </Text>
      <View style={styles.categoryFooter}>
        <Text style={[styles.viewDocs, { color: category.color }]}>Xem tài liệu</Text>
        <Feather name="arrow-right" size={16} color={category.color} />
      </View>
    </TouchableOpacity>
  );

  const renderDocList = () => (
    <View style={styles.docListContainer}>
      <View style={styles.docListHeader}>
        <TouchableOpacity
          onPress={() => setSelectedCategory(null)}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.docListHeaderContent}>
          <View
            style={[
              styles.docListIcon,
              { backgroundColor: selectedCategory.bgColor },
            ]}
          >
            <Feather
              name={selectedCategory.icon}
              size={24}
              color={selectedCategory.color}
            />
          </View>
          <View style={styles.docListHeaderText}>
            <Text style={styles.docListTitle}>{selectedCategory.title}</Text>
            <Text style={styles.docListSubtitle}>
              Tài liệu kỹ thuật EBookFarm
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.docList}>
        {selectedCategory.docs.map((doc, index) => (
          <TouchableOpacity
            key={index}
            style={styles.docItem}
            onPress={() => setSelectedDoc(doc)}
          >
            <View style={styles.docIconContainer}>
              <Feather name="file-text" size={24} color="#22c55e" />
            </View>
            <View style={styles.docContent}>
              <Text style={styles.docTitle}>{doc.title}</Text>
              <Text style={styles.docPreview} numberOfLines={2}>
                {doc.content}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tiêu chuẩn & Quy trình</Text>
        <View style={{ width: 40 }} />
      </View>

      {!selectedCategory ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.intro}>
            <Feather name="book-open" size={48} color="#22c55e" />
            <Text style={styles.introTitle}>Thư viện kỹ thuật VietGAP</Text>
            <Text style={styles.introSubtitle}>
              Tra cứu tài liệu kỹ thuật sản xuất nông nghiệp chuẩn quốc gia
            </Text>
          </View>

          {categories.map(renderCategoryCard)}

          <View style={styles.notice}>
            <Feather name="info" size={20} color="#f59e0b" />
            <Text style={styles.noticeText}>
              Tài liệu chỉ mang tính chất tham khảo. Quy trình thực tế có thể thay đổi
              tùy thuộc vào điều kiện địa phương.
            </Text>
          </View>
        </ScrollView>
      ) : (
        renderDocList()
      )}

      {/* Document Detail Modal */}
      <Modal
        visible={!!selectedDoc}
        animationType="slide"
        onRequestClose={() => setSelectedDoc(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedDoc(null)}
              style={styles.modalCloseButton}
            >
              <Feather name="x" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Chi tiết tài liệu</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedDoc?.title}</Text>
            <View style={styles.divider} />
            <Text style={styles.modalText}>{selectedDoc?.content}</Text>

            <View style={styles.modalNotice}>
              <Feather name="alert-circle" size={20} color="#f97316" />
              <View style={styles.modalNoticeContent}>
                <Text style={styles.modalNoticeTitle}>Lưu ý quan trọng:</Text>
                <Text style={styles.modalNoticeText}>
                  Tài liệu này chỉ mang tính chất tham khảo. Quy trình thực tế có thể
                  thay đổi tùy thuộc vào điều kiện thổ nhưỡng, khí hậu và giống cây
                  trồng tại từng địa phương cụ thể.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  intro: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  categorySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDocs: {
    fontSize: 14,
    fontWeight: '600',
  },
  notice: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 20,
  },
  docListContainer: {
    flex: 1,
  },
  docListHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 12,
  },
  docListHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docListIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docListHeaderText: {
    flex: 1,
  },
  docListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  docListSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  docList: {
    flex: 1,
    padding: 16,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  docIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docContent: {
    flex: 1,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  docPreview: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  modalNotice: {
    flexDirection: 'row',
    backgroundColor: '#ffedd5',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  modalNoticeContent: {
    flex: 1,
  },
  modalNoticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c2410c',
    marginBottom: 4,
  },
  modalNoticeText: {
    fontSize: 13,
    color: '#9a3412',
    lineHeight: 20,
  },
});
