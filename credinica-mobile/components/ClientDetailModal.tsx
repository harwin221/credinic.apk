import React, { useState, useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ClientDetailModalProps {
    visible: boolean;
    onClose: () => void;
    credit: any | null;
    onApplyPayment: (credit: any) => void;
    onReprintReceipt: (payment: any, credit: any) => void;
}

type TabType = 'estado' | 'consolidado' | 'abonos';

const fmt = (n: number) => Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Helper para fechas seguro (Parsing robusto)
const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    try {
        const d = typeof dateValue === 'string' ? new Date(dateValue.replace(' ', 'T')) : new Date(dateValue);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return 'N/A';
    }
};

const formatDateTime = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    try {
        const d = typeof dateValue === 'string' ? new Date(dateValue.replace(' ', 'T')) : new Date(dateValue);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 
               d.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
        return 'N/A';
    }
};

export default function ClientDetailModal({ visible, onClose, credit, onApplyPayment, onReprintReceipt }: ClientDetailModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('estado');

    const fullStatement = useMemo(() => credit?.fullStatement || { 
        installments: [], 
        payments: [], 
        totals: { 
            plan: { cuota: 0, mora: 0, pagado: 0, saldo: 0 }, 
            abonos: { total: 0, capital: 0, interes: 0, mora: 0 } 
        } 
    }, [credit]);

    if (!credit) return null;

    const details = credit.details || {};
    
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header Estilo Web Reports */}
                    <View style={styles.reportHeader}>
                        <View style={styles.headerTop}>
                            <Text style={styles.brandName}>CREDINIC</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.clientInfoSection}>
                            <Text style={styles.reportTitle}>{activeTab === 'consolidado' ? 'REPORTE ESTADO CUENTA CONSOLIDADO' : 'REPORTE ESTADO DE CUENTA'}</Text>
                            <Text style={styles.clientNameHeader}>{credit.clientName?.toUpperCase()}</Text>
                            
                            <View style={styles.metaGrid}>
                                <MetaItem label="Monto entregado:" value={`C$ ${fmt(credit.totalAmount)}`} />
                                <MetaItem label="Tasa de interés:" value={`${Number(credit.interestRate || 0).toFixed(2)}%`} />
                                <MetaItem label="Fecha de entrega:" value={formatDate(credit.deliveryDate)} />
                                <MetaItem label="Código de crédito:" value={`#${credit.creditNumber}`} />
                                <MetaItem label="Fecha vencimiento:" value={formatDate(credit.dueDate)} />
                                <MetaItem label="Gestor:" value={credit.collectionsManager?.toUpperCase() || 'N/A'} />
                                <MetaItem label="Días Atraso Actual:" value={`${details.lateDays || 0} días`} />
                            </View>
                        </View>
                    </View>

                    {/* Report Tabs */}
                    <View style={styles.reportTabs}>
                        <ReportTab active={activeTab === 'estado'} label="ESTADO CUENTA" onPress={() => setActiveTab('estado')} />
                        <ReportTab active={activeTab === 'consolidado'} label="CONSOLIDADO" onPress={() => setActiveTab('consolidado')} />
                        <ReportTab active={activeTab === 'abonos'} label="ABONOS" onPress={() => setActiveTab('abonos')} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reportContent}>
                        {activeTab === 'estado' && (
                            <View>
                                <Text style={styles.tableTitle}>Plan de pagos</Text>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.cellText, styles.colNr, styles.textBold]}>#</Text>
                                    <Text style={[styles.cellText, styles.colDate, styles.textBold]}>Fecha</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBold]}>Cuota</Text>
                                    <Text style={[styles.cellText, styles.colSmall, styles.textBold]}>Mora</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBold]}>Pagado</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBold]}>Saldo</Text>
                                </View>
                                {fullStatement.installments && fullStatement.installments.length > 0 ? (
                                    fullStatement.installments.map((item: any, idx: number) => (
                                        <View key={idx} style={[styles.tableRow, item.status === 'PAGADA' && styles.rowPaid]}>
                                            <Text style={[styles.cellText, styles.colNr]}>{item.paymentNumber || idx + 1}</Text>
                                            <Text style={[styles.cellText, styles.colDate]}>{formatDate(item.paymentDate)}</Text>
                                            <Text style={[styles.cellText, styles.colAmount]}>{fmt(item.amount)}</Text>
                                            <Text style={[styles.cellText, styles.colSmall]}>{fmt(item.lateFee || 0)}</Text>
                                            <Text style={[styles.cellText, styles.colAmount, { color: '#10b981' }]}>{fmt(item.paidAmount || 0)}</Text>
                                            <Text style={[styles.cellText, styles.colAmount]}>{fmt(item.balance || 0)}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <View style={{ padding: 20 }}>
                                        <Text style={{ textAlign: 'center', color: '#94a3b8' }}>No hay plan de pagos disponible</Text>
                                    </View>
                                )}
                                <View style={styles.tableFooter}>
                                    <Text style={[styles.cellText, styles.colNr, styles.textBlack]}>Totales</Text>
                                    <Text style={[styles.cellText, styles.colDate]}></Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBlack]}>{fmt(fullStatement.totals?.plan?.cuota)}</Text>
                                    <Text style={[styles.cellText, styles.colSmall, styles.textBlack]}>{fmt(fullStatement.totals?.plan?.mora)}</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBlack]}>{fmt(fullStatement.totals?.plan?.pagado)}</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBlack]}>{fmt(fullStatement.totals?.plan?.saldo)}</Text>
                                </View>
                            </View>
                        )}

                        {activeTab === 'consolidado' && (
                            <View style={styles.consolidatedView}>
                                <Text style={styles.tableTitle}>Resumen Global</Text>
                                <View style={styles.statsCard}>
                                    <StatRow label="CRÉDITO PROMEDIO:" value={`C$ ${fmt(credit.summary?.averageAmount || credit.totalAmount)}`} />
                                    <StatRow label="CANTIDAD DE CRÉDITOS:" value={`${credit.summary?.totalCredits || 1}`} />
                                    <StatRow label="CÓDIGO DEL CLIENTE:" value={credit.clientCode} />
                                    <StatRow label="ACTIVIDAD ECONÓMICA:" value={credit.summary?.economicActivity || "No especificada"} />
                                    <StatRow label="PROMEDIO CRÉDITO ACTUAL:" value={`${Number(details.avgLateDaysCredit || 0).toFixed(2)} días`} />
                                    <StatRow label="PROMEDIO GLOBAL:" value={`${Number(credit.summary?.globalAverageLateDays || details.avgLateDaysGlobal || 0).toFixed(2)} días`} />
                                </View>

                                <Text style={[styles.tableTitle, { marginTop: 20 }]}>Detalle General</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                                    <View>
                                        <View style={styles.tableHeader}>
                                            <Text style={[styles.cellText, { width: 90 }, styles.textBold]}>Crédito #</Text>
                                            <Text style={[styles.cellText, { width: 90 }, styles.textBold]}>Desembolso</Text>
                                            <Text style={[styles.cellText, { width: 60 }, styles.textBold]}>T. Interés</Text>
                                            <Text style={[styles.cellText, { width: 50 }, styles.textBold]}>Plazo</Text>
                                            <Text style={[styles.cellText, { width: 90 }, styles.textBold]}>Entrega</Text>
                                            <Text style={[styles.cellText, { width: 90 }, styles.textBold]}>Vencimiento</Text>
                                            <Text style={[styles.cellText, { width: 70 }, styles.textBold]}>Días Atraso</Text>
                                        </View>
                                        {(credit.history || []).map((hist: any, hIdx: number) => (
                                            <View key={hIdx} style={styles.tableRow}>
                                                <Text style={[styles.cellText, { width: 90 }]}>{hist.creditNumber}</Text>
                                                <Text style={[styles.cellText, { width: 90 }]}>C$ {fmt(hist.amount)}</Text>
                                                <Text style={[styles.cellText, { width: 60 }]}>{Number(hist.interestRate || 0).toFixed(2)}%</Text>
                                                <Text style={[styles.cellText, { width: 50 }]}>{hist.termMonths}</Text>
                                                <Text style={[styles.cellText, { width: 90 }]}>{formatDate(hist.deliveryDate)}</Text>
                                                <Text style={[styles.cellText, { width: 90 }]}>{formatDate(hist.dueDate)}</Text>
                                                <Text style={[styles.cellText, { width: 70, color: hist.avgLateDays > 1 ? '#e11d48' : '#334155' }]}>
                                                    {Number(hist.avgLateDays || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                        {activeTab === 'abonos' && (
                            <View>
                                <Text style={styles.tableTitle}>Abonos del cliente</Text>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.cellText, styles.colId, styles.textBold]}># Transacción</Text>
                                    <Text style={[styles.cellText, styles.colDateLarge, styles.textBold]}>Fecha Pago</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBold]}>Capital</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBold]}>Interés</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBold]}>Total</Text>
                                    <Text style={[styles.cellText, { width: 40 }]}></Text>
                                </View>
                                {fullStatement.payments.map((payment: any, idx: number) => (
                                    <View key={idx} style={styles.tableRow}>
                                        <Text style={[styles.cellText, styles.colId]}>{payment.transactionNumber || payment.receiptNumber || 'N/A'}</Text>
                                        <Text style={[styles.cellText, styles.colDateLarge]}>{formatDateTime(payment.paymentDate)}</Text>
                                        <Text style={[styles.cellText, styles.colAmount]}>{fmt(payment.principalApplied)}</Text>
                                        <Text style={[styles.cellText, styles.colAmount]}>{fmt(payment.interestApplied)}</Text>
                                        <Text style={[styles.cellText, styles.colAmount, { fontWeight: '700' }]}>{fmt(payment.amount)}</Text>
                                        <TouchableOpacity 
                                            style={[styles.printerBtn]}
                                            onPress={() => onReprintReceipt(payment, credit)}
                                        >
                                            <MaterialCommunityIcons name="printer" size={18} color="#0ea5e9" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <View style={styles.tableFooter}>
                                    <Text style={[styles.cellText, styles.colId, styles.textBlack]}>Totales</Text>
                                    <Text style={[styles.cellText, styles.colDateLarge]}></Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBlack]}>{fmt(fullStatement.totals.abonos.capital)}</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBlack]}>{fmt(fullStatement.totals.abonos.interes)}</Text>
                                    <Text style={[styles.cellText, styles.colAmount, styles.textBlack]}>{fmt(fullStatement.totals.abonos.total)}</Text>
                                    <Text style={[styles.cellText, { width: 40 }]}></Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                </View>
            </View>
        </Modal>
    );
}

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{label}</Text>
            <Text style={styles.metaValue}>{value}</Text>
        </View>
    );
}

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.statRow}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
        </View>
    );
}

function ReportTab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
    return (
        <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
            <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    container: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '94%', width: '100%', overflow: 'hidden' },
    reportHeader: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fdfdfd' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    brandName: { fontSize: 20, fontWeight: '900', color: '#0ea5e9' },
    closeBtn: { padding: 4 },
    clientInfoSection: { marginTop: 10 },
    reportTitle: { fontSize: 13, color: '#334155', fontWeight: '700', borderBottomWidth: 1.5, borderBottomColor: '#334155', paddingBottom: 2, marginBottom: 8 },
    clientNameHeader: { fontSize: 16, fontWeight: '800', color: '#0ea5e9', marginBottom: 10 },
    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metaItem: { width: '48%', marginBottom: 4 },
    metaLabel: { fontSize: 10, color: '#64748b' },
    metaValue: { fontSize: 11, fontWeight: '700', color: '#1e293b' },
    reportTabs: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 4, gap: 4 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: '#0ea5e9' },
    tabBtnText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
    tabBtnTextActive: { color: '#fff' },
    reportContent: { padding: 15, paddingBottom: 40 },
    tableTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#0ea5e9', paddingLeft: 8 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: '#e2e8f0', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
    tableFooter: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 8, paddingHorizontal: 4, borderTopWidth: 1.5, borderTopColor: '#334155', marginTop: 2 },
    tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    rowPaid: { backgroundColor: '#f0fdf4' },
    cellText: { fontSize: 10, color: '#334155' },
    textBold: { fontWeight: '800' },
    textBlack: { color: '#000', fontWeight: '800' },
    colNr: { width: 25 },
    colDate: { width: 70 },
    colDateLarge: { width: 100 },
    colAmount: { flex: 1, textAlign: 'right' },
    colSmall: { width: 50, textAlign: 'right' },
    colId: { width: 80 },
    printerBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
    reportFooter: { padding: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    paymentBtn: { backgroundColor: '#10b981', height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    paymentBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    consolidatedView: { gap: 10 },
    statsCard: { padding: 15, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingBottom: 4 },
    statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
    statValue: { fontSize: 11, fontWeight: '700', color: '#1e293b' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },
});
