import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ShopOwnerBills = () => {
  const [completedRepairs, setCompletedRepairs] = useState([]);
  const [bills, setBills] = useState([]);
  const [showBillForm, setShowBillForm] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [showRepairDetails, setShowRepairDetails] = useState(false);
  const [newBill, setNewBill] = useState({
    partsCost: '',
    laborCost: '',
    tax: '',
    total: '',
    notes: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const formatNumberDisplay = (val) => {
    if (val === '' || val === null || typeof val === 'undefined') return '';
    const n = Number(val || 0);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const normalizeBill = (item) => ({
    id: item.id || item.ID || item.billId || item.BillID || item.bill_id || null,
    ticketId: item.ticketid || item.ticket_id || item.TicketID || item.repairId || item.repair_id || item.ticketId || item.pass || item.Pass || item.pass_code || item.PassCode || (item.ticket_id ? item.ticket_id : ''),
    ticket_id: item.ticket_id || item.ticketid || item.TicketID || item.ticketId || item.pass || item.Pass || item.pass_code || item.PassCode || '',
    customerName: item.customer_name || item.customer || item.customerName || (item.customerName && typeof item.customerName === 'string' ? item.customerName : ''),
    customerPhone: item.customer_phone || item.customerPhone || item.phone || item.phone_no || item.msisdn || item.mobile || '',
    device: item.device || item.Device || (item.brand ? `${item.brand} ${item.model || ''}`.trim() : ''),
    issue: item.issue || item.issue_description || item.problem || item.Overview || item.overview || '',
    partsCost: Number(item.parts_cost || item.partsCost || item.parts || item.Parts || 0) || 0,
    laborCost: Number(item.labor_cost || item.laborCost || item.labor || item.Labor || 0) || 0,
    tax: Number(item.tax || item.tax_amount || item.taxAmount || 0) || 0,
    totalAmount: Number(item.total_amount || item.total || item.totalAmount || 0) || 0,
    status: item.status || item.Status || 'Pending',
    pass: item.pass || item.Pass || item.pass_code || item.PassCode || '',
    raw: item
  });

  useEffect(() => {
    let mounted = true;

    const normalize = (item) => ({
      id: item.ticket_id || item.TicketID || item.ticketNo || item.ticket_number || item.id || item.Id || item.TicketID || '',
      brand: item.brand || item.device || item.device_brand || item.brand_name || '',
      model: item.model || item.device_model || item.model_name || '',
      issue: item.issue || item.issue_description || item.problem || item.Overview || '',
      customerName: item.customer_name || item.customer || item.customerName || item.name || '',
      customerPhone: item.phone_no || item.phone || item.customer_phone || item.customerPhone || item.mobile || item.msisdn || '',
      status: (item.status || item.Status || '').toString(),
      imei: item.imei || item.IMEI || item.device_imei || '',
      completedAt: item.completed_date || item.completedAt || item.completedOn || item.completed_on || item.ClosedDate || item.created_date || '',
      raw: item
    });

    const loadData = async () => {
      const storedBillsRaw = JSON.parse(localStorage.getItem('repairBills') || '[]');
      const storedBills = (Array.isArray(storedBillsRaw) ? storedBillsRaw : []).filter(Boolean);
      const keyForLocal = (b) => String(b && (b.ticketId || b.ticket_id || b.repairId || b.id || '')).trim();
      const seenLocal = new Set();
      const storedBillsClean = [];
      for (const sb of storedBills) {
        const k = keyForLocal(sb);
        if (!k) continue;
        if (seenLocal.has(k)) continue;
        seenLocal.add(k);
        storedBillsClean.push(sb);
      }

      try {
        const res = await api.get('https://teknicitybackend.dockyardsoftware.com/RepairTicket/GetCompletedRepairTickets');

        let list = [];
        if (res && res.data) {
          if (Array.isArray(res.data)) list = res.data;
          else if (Array.isArray(res.data.ResultSet)) list = res.data.ResultSet;
          else if (res.data.Result) {
            try { list = JSON.parse(res.data.Result); } catch (e) { list = res.data.Result; }
          } else if (Array.isArray(res.data.data)) list = res.data.data;
        }

        const normalized = (list || []).map(normalize);
        try { localStorage.setItem('repairTickets', JSON.stringify(normalized)); } catch (e) { }

        const completed = normalized.filter(t => {
          const s = (t.status || '').toString().toLowerCase();
          const hasCompletedFlag = s.indexOf('completed') !== -1 || s.indexOf('done') !== -1 || s.indexOf('closed') !== -1;
          return hasCompletedFlag || (t.completedAt || '').toString().trim() !== '';
        });

        const completedList = completed;

        try {
          const billRes = await api.get('https://teknicitybackend.dockyardsoftware.com/CustomerBill/GetAllCustomerBills');
          let billList = [];
          if (billRes && billRes.data) {
            if (Array.isArray(billRes.data)) billList = billRes.data;
            else if (Array.isArray(billRes.data.ResultSet)) billList = billRes.data.ResultSet;
            else if (billRes.data.Result) {
              try { billList = JSON.parse(billRes.data.Result); } catch (e) { billList = billRes.data.Result; }
            } else if (Array.isArray(billRes.data.data)) billList = billRes.data.data;
          }

          const normalizedBillsFromServer = (billList || []).map(normalizeBill);

          if (mounted && normalizedBillsFromServer.length === 0) {
            if (mounted) setCompletedRepairs(completedList || []);
            setBills([]);
            try { localStorage.setItem('repairBills', JSON.stringify([])); } catch (e) { }
            return;
          }

          if (mounted && normalizedBillsFromServer.length > 0) {
            const byKey = new Map();
            const keyFor = (b) => String(b.ticketId || b.ticket_id || b.repairId || b.id || '');

            normalizedBillsFromServer.forEach(b => {
              const k = keyFor(b);
              if (!k) return;
              if (!byKey.has(k)) byKey.set(k, b);
            });

            const serverRepairKeys = new Set((normalizedBillsFromServer || []).map(b => String(b.repairId || b.pass || b.ticketId || b.ticket_id || '')));

            (storedBillsClean || []).forEach(local => {
              const isLocal = String((local && local.id) || '').startsWith('local-');
              const localRepairKey = String((local && (local.repairId || local.pass || local.ticketId || local.ticket_id)) || '');
              if (isLocal && localRepairKey && serverRepairKeys.has(localRepairKey)) {
                return;
              }

              const k = keyFor(local);
              if (!k) return;
              if (!byKey.has(k)) {
                byKey.set(k, local);
              } else {
                const serverItem = byKey.get(k);
                if ((!serverItem.ticketId || serverItem.ticketId === '') && (local.ticketId || local.ticket_id)) {
                  serverItem.ticketId = local.ticketId || local.ticket_id;
                  serverItem.ticket_id = serverItem.ticket_id || local.ticket_id || local.ticketId;
                }
                if ((serverItem.totalAmount === undefined || serverItem.totalAmount === 0) && (local.totalAmount || local.total)) {
                  serverItem.totalAmount = local.totalAmount || local.total;
                }
              }
            });

            const serverOnly = (normalizedBillsFromServer || []).slice();
            setBills(serverOnly);
            try { localStorage.setItem('repairBills', JSON.stringify(serverOnly)); } catch (e) { }
            try {
              const completedWithoutBills = (completedList || []).filter(ticket => !serverOnly.some(b => String(b.repairId) === String(ticket.id)));
              if (mounted) setCompletedRepairs(completedWithoutBills || []);
            } catch (e) { if (mounted) setCompletedRepairs([]); }
          } else if (mounted) {
            setBills(storedBills);
          }
        } catch (e) {
          if (mounted) setBills(storedBills);
        }
        return;
      } catch (err) {
        console.warn('GetCompletedRepairTickets failed; server unavailable', err && err.message ? err.message : err);
        if (mounted) {
          setCompletedRepairs([]);
          setBills([]);
        }
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const formatDate = (val) => {
    if (!val) return '';
    try {
      if (typeof val === 'string' && val.indexOf('T') !== -1) return val.split('T')[0];
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      return String(val).split('T')[0];
    } catch (e) { return String(val); }
  };

  const openBillForm = (repair) => {
    setSelectedRepair(repair);
    setNewBill({
      partsCost: '',
      laborCost: '',
      tax: '',
      total: '',
      notes: ''
    });
    setShowBillForm(true);

    (async () => {
      try {
        const ticketId = repair && (repair.id || repair.ticketId || repair.ticket_id || repair.pass) ? (repair.id || repair.ticketId || repair.ticket_id || repair.pass) : null;
        if (!ticketId) return;
        const res = await api.get(`https://teknicitybackend.dockyardsoftware.com/UsageReport/GetTicketUsageCost?ticket_id=${encodeURIComponent(ticketId)}`);
        let payload = res && res.data ? res.data : null;

        let sum = 0;
        const rs = payload && payload.ResultSet ? payload.ResultSet : payload;
        const maybeGrand = rs && (rs.GrandTotal || rs.grandTotal || rs.grand_total || rs.Grandtotal);
        if (typeof maybeGrand !== 'undefined' && String(maybeGrand).trim() !== '') {
          const parsed = Number(String(maybeGrand).replace(/,/g, ''));
          if (Number.isFinite(parsed)) {
            sum = parsed;
          }
        }

        if (sum === 0) {
          let items = [];
          if (!payload) items = [];
          else if (Array.isArray(payload)) items = payload;
          else if (Array.isArray(payload.ResultSet)) items = payload.ResultSet;
          else if (payload.Result) {
            try { items = typeof payload.Result === 'string' ? JSON.parse(payload.Result) : payload.Result; } catch (e) { items = payload.Result; }
          } else if (Array.isArray(payload.data)) items = payload.data;
          else if (rs && Array.isArray(rs.Items)) items = rs.Items;
          else items = [payload];

          const values = (items || []).map(it => Number(it && (it.TotalPrice || it.totalPrice || it.total_price || it.price || it.total)) || 0);
          sum = values.reduce((a, b) => a + b, 0);
        }

        if (sum > 0) {
          setNewBill(prev => {
            const apiParts = sum;
            const labor = prev.laborCost === '' ? 0 : Number(prev.laborCost || 0);
            const tax = prev.tax === '' ? 0 : Number(prev.tax || 0);
            const total = apiParts + labor + tax;
            return { ...prev, partsCost: apiParts, total: total };
          });
        }
      } catch (e) {
        console.debug('GetTicketUsageCost failed', e && e.message ? e.message : e);
      }
    })();
  };

  const openRepairDetails = (repair) => {
    setSelectedRepair(repair);
    setShowRepairDetails(true);
  };

  const handleBillChange = (e) => {
    const { name, value } = e.target;
    const isNotes = name === 'notes';
    let fieldValue;
    if (isNotes) {
      fieldValue = value;
    } else {
      const raw = String(value).replace(/,/g, '').trim();
      if (raw === '') fieldValue = '';
      else {
        const n = parseFloat(raw);
        fieldValue = Number.isFinite(n) ? n : '';
      }
    }

    const updatedBill = {
      ...newBill,
      [name]: fieldValue
    };

    const p = updatedBill.partsCost === '' ? 0 : Number(updatedBill.partsCost || 0);
    const l = updatedBill.laborCost === '' ? 0 : Number(updatedBill.laborCost || 0);
    const t = updatedBill.tax === '' ? 0 : Number(updatedBill.tax || 0);
    const totalNumber = p + l + t;
    updatedBill.total = (p === 0 && l === 0 && t === 0) ? '' : totalNumber;

    setNewBill(updatedBill);
  };

  const createBill = (e) => {
    e.preventDefault();

    if (!selectedRepair) return;

    const serverPayload = {
      repairId: Number(selectedRepair.id) || selectedRepair.id,
      pass: Number(selectedRepair.id) || selectedRepair.id,
      customerName: selectedRepair.customerName || (selectedRepair.raw && (selectedRepair.raw.customer_name || selectedRepair.raw.customer || selectedRepair.raw.name)) || '',
      customer_name: selectedRepair.customerName || (selectedRepair.raw && (selectedRepair.raw.customer_name || selectedRepair.raw.customer || selectedRepair.raw.name)) || '',
      customerPhone: selectedRepair.customerPhone || (selectedRepair.raw && (selectedRepair.raw.customer_phone || selectedRepair.raw.phone_no || selectedRepair.raw.phone || selectedRepair.raw.mobile || selectedRepair.raw.msisdn)) || '',
      customer_phone: selectedRepair.customerPhone || (selectedRepair.raw && (selectedRepair.raw.customer_phone || selectedRepair.raw.phone_no || selectedRepair.raw.phone || selectedRepair.raw.mobile || selectedRepair.raw.msisdn)) || '',
      phone: selectedRepair.customerPhone || (selectedRepair.raw && (selectedRepair.raw.phone || selectedRepair.raw.phone_no || selectedRepair.raw.customer_phone || selectedRepair.raw.mobile || selectedRepair.raw.msisdn)) || '',
      phone_no: selectedRepair.customerPhone || (selectedRepair.raw && (selectedRepair.raw.phone_no || selectedRepair.raw.phone || selectedRepair.raw.customer_phone || selectedRepair.raw.mobile || selectedRepair.raw.msisdn)) || '',
      msisdn: selectedRepair.customerPhone || (selectedRepair.raw && (selectedRepair.raw.msisdn || selectedRepair.raw.mobile || selectedRepair.raw.phone || selectedRepair.raw.phone_no)) || '',
      device: `${selectedRepair.brand || ''} ${selectedRepair.model || ''}`.trim(),
      issue: selectedRepair.issue || '',
      parts_cost: Number(newBill.partsCost) || 0,
      labor_cost: Number(newBill.laborCost) || 0,
      tax: Number(newBill.tax) || 0,
      total_amount: Number(newBill.total) || 0,
      notes: newBill.notes || ''
    };

    try { console.debug('AddCustomerBill serverPayload:', serverPayload); } catch (e) { }

    setIsCreating(true);
    (async () => {
      let billCreated = false;
      let serverBillId = null;

      try {
        const res = await api.post('https://teknicitybackend.dockyardsoftware.com/CustomerBill/AddCustomerBill', serverPayload, {
          headers: { 'Content-Type': 'application/json' }
        });
        try { console.debug('AddCustomerBill response:', res && res.data ? res.data : res); } catch (e) { }

        const ok = res && res.status >= 200 && res.status < 300 && (
          !res.data || typeof res.data.StatusCode === 'undefined' || res.data.StatusCode === 200 || res.data.success === true
        );

        if (ok) {
          billCreated = true;

          try {
            const d = res && res.data ? res.data : null;
            if (d) {
              serverBillId = d.id || d.insertId || d.ID || null;
              if (!serverBillId && Array.isArray(d.ResultSet) && d.ResultSet.length > 0) {
                serverBillId = d.ResultSet[0].id || d.ResultSet[0].ID || d.ResultSet[0].insertId || null;
              }
              if (!serverBillId && d.Result) {
                try {
                  const parsed = typeof d.Result === 'string' ? JSON.parse(d.Result) : d.Result;
                  serverBillId = (parsed && (parsed.id || parsed.insertId || parsed.ID)) || serverBillId;
                } catch (e) { }
              }
              if (!serverBillId && d.data) {
                serverBillId = d.data.id || d.data.insertId || d.data.ID || serverBillId;
              }
            }
            if (!serverBillId && res && (typeof res.data === 'string' || typeof res.data === 'number')) {
              serverBillId = String(res.data);
            }
          } catch (e) {
            serverBillId = null;
          }

          const clientId = serverBillId || selectedRepair.id;
          const newBillData = {
            id: clientId,
            repairId: selectedRepair.id,
            pass: selectedRepair.id,
            ticketId: selectedRepair.id,
            ticket_id: selectedRepair.id,
            customerName: selectedRepair.customerName,
            customerPhone: selectedRepair.customerPhone,
            device: `${selectedRepair.brand} ${selectedRepair.model}`,
            issue: selectedRepair.issue,
            partsCost: Number(newBill.partsCost) || 0,
            laborCost: Number(newBill.laborCost) || 0,
            tax: Number(newBill.tax) || 0,
            total: Number(newBill.total) || 0,
            notes: newBill.notes || '',
            createdAt: new Date().toISOString().split('T')[0],
            status: 'Pending Payment',
            rawResponse: res && res.data ? res.data : null
          };

          const existsIndex = bills.findIndex(b => String(b.repairId) === String(selectedRepair.id) || String(b.pass) === String(selectedRepair.id) || String(b.id) === String(clientId));
          let updatedBills;
          if (existsIndex !== -1) {
            updatedBills = bills.slice();
            updatedBills[existsIndex] = { ...updatedBills[existsIndex], ...newBillData };
          } else {
            updatedBills = [...bills, newBillData];
          }

          setBills(updatedBills);
          try { localStorage.setItem('repairBills', JSON.stringify(updatedBills)); } catch (e) { }

          try {
            const billResAfter = await api.get('https://teknicitybackend.dockyardsoftware.com/CustomerBill/GetAllCustomerBills');
            let billListAfter = [];
            if (billResAfter && billResAfter.data) {
              if (Array.isArray(billResAfter.data)) billListAfter = billResAfter.data;
              else if (Array.isArray(billResAfter.data.ResultSet)) billListAfter = billResAfter.data.ResultSet;
              else if (billResAfter.data.Result) {
                try { billListAfter = JSON.parse(billResAfter.data.Result); } catch (e) { billListAfter = billResAfter.data.Result; }
              } else if (Array.isArray(billResAfter.data.data)) billListAfter = billResAfter.data.data;
            }
            const normalizedBillsAfter = (billListAfter || []).map(normalizeBill);
            if (normalizedBillsAfter.length > 0) {
              setBills(normalizedBillsAfter);
              try { localStorage.setItem('repairBills', JSON.stringify(normalizedBillsAfter)); } catch (e) { }
              try { setCompletedRepairs(prev => (prev || []).filter(t => String(t.id) !== String(selectedRepair.id))); } catch (e) { }
            }
          } catch (e) { }

          setShowBillForm(false);
        }
      } catch (err) {
        console.warn('AddCustomerBill failed', err && err.message ? err.message : err);
      }

      const idToSend = selectedRepair.id || selectedRepair.pass;
      let smsSuccess = false;
      let statusUpdateSuccess = false;
      let smsResponse = null;

      if (idToSend) {
        try {
          const smsResult = await sendSMSNotification(idToSend);
          smsResponse = smsResult;
          smsSuccess = smsResult && (smsResult.success === true ||
            (smsResult.response && (smsResult.response.success === true ||
              smsResult.response.StatusCode === 200 ||
              smsResult.response.status === 'success')));

          if (!smsSuccess && smsResult && smsResult.response) {
            const respStr = JSON.stringify(smsResult.response).toLowerCase();
            if (respStr.includes('success') || respStr.includes('sent') || respStr.includes('ok') || respStr.includes('delivered')) {
              smsSuccess = true;
            }
          }

          if (smsResult && smsResult.response && smsResult.response.data) {
            const dataStr = JSON.stringify(smsResult.response.data).toLowerCase();
            if (dataStr.includes('success') || dataStr.includes('sent') || dataStr.includes('ok')) {
              smsSuccess = true;
            }
          }
        } catch (e) {
          console.warn('SMS notification error', e);
          smsSuccess = false;
        }

        try {
          const statusResult = await updateRepairTicketStatus(idToSend);
          statusUpdateSuccess = statusResult && statusResult.success === true;
        } catch (e) {
          statusUpdateSuccess = false;
        }
      }

      if (billCreated) {
        if (smsSuccess && statusUpdateSuccess) {
          alert('✅ Bill created successfully, customer notified via SMS, and ticket marked Payment Process.');
        } else if (smsSuccess) {
          alert('✅ Bill created and SMS sent successfully! Customer has been notified.');
        } else if (statusUpdateSuccess) {
          alert('✅ Bill created and ticket marked Payment Process. (SMS notification pending)');
        } else {
          alert('✅ Bill created successfully.');
        }
      } else if (smsSuccess || statusUpdateSuccess) {
        const parts = [];
        if (smsSuccess) parts.push('SMS sent to customer');
        if (statusUpdateSuccess) parts.push('ticket status updated');
        alert(`⚠️ Bill creation is processing, but ${parts.join(' and ')} completed successfully.`);
      } else if (idToSend && (smsSuccess === false && statusUpdateSuccess === false)) {
        alert('❌ Bill creation failed. Please try again when the server is available.');
      } else {
        alert('❌ Bill creation failed. Please try again.');
      }

      setIsCreating(false);
    })();
  };

  const sendSMSNotification = async (ticketId) => {
    const tryPost = async (payload) => {
      try { console.debug('SendCustomerBillSMS payload:', payload); } catch (e) { }
      const res = await api.post('https://teknicitybackend.dockyardsoftware.com/CustomerBill/SendCustomerBillSMS', payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      let ok = false;
      if (res && res.status >= 200 && res.status < 300) {
        ok = true;
        if (res.data) {
          if (res.data.StatusCode === 500 || res.data.StatusCode === 400 ||
            res.data.success === false || res.data.error === true) {
            ok = false;
          }
        }
      }

      try {
        const smsLogs = JSON.parse(localStorage.getItem('smsLogs') || '[]');
        const smsId = smsLogs.length > 0 ? Math.max(...smsLogs.map(s => s.id || 0)) + 1 : 1;
        smsLogs.push({
          id: smsId,
          payload,
          status: ok ? 'Sent' : 'Pending',
          attemptedAt: new Date().toISOString(),
          serverResponse: res && res.data ? res.data : res
        });
        localStorage.setItem('smsLogs', JSON.stringify(smsLogs));
      } catch (e) { }

      return { ok, res };
    };

    try {
      let attempt = await tryPost({ pass: String(ticketId) });
      if (attempt.ok) return { success: true, response: attempt.res && attempt.res.data ? attempt.res.data : attempt.res };

      attempt = await tryPost({ ticketid: String(ticketId) });
      if (attempt.ok) return { success: true, response: attempt.res && attempt.res.data ? attempt.res.data : attempt.res };

      const numeric = Number(ticketId);
      if (Number.isFinite(numeric)) {
        attempt = await tryPost({ ticketid: numeric });
        if (attempt.ok) return { success: true, response: attempt.res && attempt.res.data ? attempt.res.data : attempt.res };
      }

      if (attempt && attempt.res && attempt.res.data) {
        const respData = attempt.res.data;
        const respStr = JSON.stringify(respData).toLowerCase();
        if (respStr.includes('success') || respStr.includes('sent') || respStr.includes('ok') ||
          respStr.includes('delivered') || (respData.StatusCode === 200) || respData.success === true) {
          return { success: true, response: respData };
        }
      }

      return { success: false, response: attempt.res && attempt.res.data ? attempt.res.data : attempt.res };
    } catch (err) {
      try {
        const smsLogs = JSON.parse(localStorage.getItem('smsLogs') || '[]');
        const smsId = smsLogs.length > 0 ? Math.max(...smsLogs.map(s => s.id || 0)) + 1 : 1;
        smsLogs.push({ id: smsId, payload: { ticketid: String(ticketId) }, status: 'Pending', attemptedAt: new Date().toISOString(), error: err && err.message ? err.message : String(err) });
        localStorage.setItem('smsLogs', JSON.stringify(smsLogs));
      } catch (e) { }
      return { success: false, error: err };
    }
  };

  const updateRepairTicketStatus = async (ticketId) => {
    if (!ticketId) return { success: false, error: 'missing ticketId' };
    const statusCandidates = [
      'Payment Process',
      'Payment Processing',
      'Payment Pending',
      'Pending Payment',
      'Payment'
    ];

    for (const statusVal of statusCandidates) {
      const payload = {
        ticketId: String(ticketId),
        ticket_id: String(ticketId),
        repairId: String(ticketId),
        repair_id: String(ticketId),
        pass: String(ticketId),
        status: statusVal
      };

      try {
        try { console.debug('UpdateRepairTicketStatus attempt payload:', payload); } catch (e) { }
        const res = await api.post('https://teknicitybackend.dockyardsoftware.com/RepairTicket/UpdateRepairTicketStatus', payload, {
          headers: { 'Content-Type': 'application/json' }
        });

        const ok = res && res.status >= 200 && res.status < 300 && (!res.data || typeof res.data.StatusCode === 'undefined' || res.data.StatusCode === 200 || res.data.success === true);

        try {
          const logs = JSON.parse(localStorage.getItem('repairStatusLogs') || '[]');
          const id = logs.length > 0 ? Math.max(...logs.map(l => l.id || 0)) + 1 : 1;
          logs.push({ id, payload, status: ok ? 'Updated' : 'Failed', attemptedAt: new Date().toISOString(), serverResponse: res && res.data ? res.data : res });
          localStorage.setItem('repairStatusLogs', JSON.stringify(logs));
        } catch (e) { }

        if (ok) return { success: true, response: res && res.data ? res.data : res, usedStatus: statusVal };

        const bodyText = (res && res.data && (res.data.Result || res.data.message || JSON.stringify(res.data))) || '';
        if ((typeof bodyText === 'string' && bodyText.indexOf('CK__RepairTic__statu') !== -1) || String(bodyText).toLowerCase().indexOf('check constraint') !== -1) {
          continue;
        }

        return { success: false, response: res && res.data ? res.data : res };
      } catch (err) {
        try {
          const logs = JSON.parse(localStorage.getItem('repairStatusLogs') || '[]');
          const id = logs.length > 0 ? Math.max(...logs.map(l => l.id || 0)) + 1 : 1;
          logs.push({ id, payload, status: 'Error', attemptedAt: new Date().toISOString(), error: err && err.message ? err.message : String(err) });
          localStorage.setItem('repairStatusLogs', JSON.stringify(logs));
        } catch (e) { }

        const errMsg = err && (err.message || (err.response && err.response.data && (err.response.data.Result || err.response.data.message))) ? (err.message || (err.response && err.response.data && (err.response.data.Result || err.response.data.message))) : '';
        if (String(errMsg).toLowerCase().indexOf('check constraint') !== -1 || String(errMsg).indexOf('CK__RepairTic__statu') !== -1) {
          continue;
        }

        return { success: false, error: err };
      }
    }

    return { success: false, error: 'All status candidates rejected by server CHECK constraint' };
  };

  const sanitizeOverview = (text) => {
    if (!text) return '';
    const blacklist = [
      'Keyboard not responding',
      'overheating'
    ];
    let out = String(text);
    blacklist.forEach(phrase => {
      const re = new RegExp(phrase, 'ig');
      out = out.replace(re, '');
    });
    out = out.replace(/\s+/g, ' ').trim();
    out = out.replace(/^[-—:\s]+|[-—:\s]+$/g, '');
    return out;
  };

  const updateBillStatus = async (billId, newStatus) => {
    let previousBillState = null;

    setBills(prev => {
      const billIndex = prev.findIndex(b =>
        String(b.id) === String(billId) ||
        String(b.pass) === String(billId) ||
        String(b.ticketId) === String(billId) ||
        String(b.ticket_id) === String(billId)
      );

      if (billIndex === -1) return prev;

      previousBillState = prev[billIndex];

      const updated = [...prev];
      updated[billIndex] = { ...updated[billIndex], status: newStatus };

      try { localStorage.setItem('repairBills', JSON.stringify(updated)); } catch (e) { }

      return updated;
    });

    const billObj = bills.find(b =>
      String(b.id) === String(billId) ||
      String(b.pass) === String(billId) ||
      String(b.ticketId) === String(billId) ||
      String(b.ticket_id) === String(billId)
    );

    let ticketIdToSend = String(billId);
    if (billObj) {
      const raw = billObj.raw || {};
      const candidates = [raw.ticketid, raw.ticket_id, raw.TicketID, billObj.ticket_id, billObj.ticketId, billObj.repairId, billObj.pass, billObj.id];
      const found = candidates.find(c => (typeof c !== 'undefined' && c !== null && String(c).trim() !== ''));
      ticketIdToSend = found ? String(found) : String(billId);
    }

    const mappedStatus = (String(newStatus || '').toLowerCase() === 'refunded') ? 'c' : newStatus;
    const passValue = billObj && (billObj.pass || billObj.Pass || billObj.pass_code || billObj.PassCode || billObj.passCode || billObj.passcode || billObj.raw && (billObj.raw.pass || billObj.raw.Pass))
      ? String(billObj.pass || billObj.Pass || billObj.pass_code || billObj.PassCode || billObj.passCode || billObj.passcode || (billObj.raw && (billObj.raw.pass || billObj.raw.Pass)))
      : ticketIdToSend;

    const payload = {
      pass: passValue,
      status: mappedStatus
    };

    try {
      try { console.debug('UpdateCustomerBillStatus payload:', payload); } catch (e) { }
      const res = await api.post('https://teknicitybackend.dockyardsoftware.com/CustomerBill/UpdateCustomerBillStatus', payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      try {
        const logs = JSON.parse(localStorage.getItem('billStatusLogs') || '[]');
        const id = logs.length > 0 ? Math.max(...logs.map(l => l.id || 0)) + 1 : 1;
        logs.push({ id, payload, attemptedAt: new Date().toISOString(), serverResponse: res && res.data ? res.data : res });
        localStorage.setItem('billStatusLogs', JSON.stringify(logs));
      } catch (e) { }

      return res;
    } catch (e) {
      console.warn('UpdateCustomerBillStatus failed; rolling back', e && e.message ? e.message : e);

      if (previousBillState) {
        setBills(prev => {
          const billIndex = prev.findIndex(b =>
            String(b.id) === String(billId) ||
            String(b.pass) === String(billId) ||
            String(b.ticketId) === String(billId) ||
            String(b.ticket_id) === String(billId)
          );

          if (billIndex === -1) return prev;

          const rolledBack = [...prev];
          rolledBack[billIndex] = { ...rolledBack[billIndex], status: previousBillState.status };

          try { localStorage.setItem('repairBills', JSON.stringify(rolledBack)); } catch (ee) { }

          return rolledBack;
        });
      }

      try {
        const logs = JSON.parse(localStorage.getItem('billStatusLogs') || '[]');
        const id = logs.length > 0 ? Math.max(...logs.map(l => l.id || 0)) + 1 : 1;
        logs.push({ id, payload: { ...payload, error: e && e.message ? e.message : String(e) }, attemptedAt: new Date().toISOString() });
        localStorage.setItem('billStatusLogs', JSON.stringify(logs));
      } catch (ee) { }

      alert('Failed to update status on server. Status has been reverted.');
    }
  };

  const printBill = (bill) => {
    try {
      const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const dt = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const formattedDate = `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

      const num = (v) => {
        const n = Number(v || 0);
        if (!Number.isFinite(n)) return '0.00';
        return n.toFixed(2);
      };

      const padRight = (s, l) => (s + ' '.repeat(Math.max(0, l - String(s).length))).slice(0, l);
      const padLeft = (s, l) => ((' '.repeat(Math.max(0, l - String(s).length))) + s).slice(-l);

      const lineWidth = 32;
      const labelWidth = 20;

      const partsLine = `${padRight('Parts', labelWidth)} ${padLeft('Rs. ' + num(bill.partsCost || bill.parts_cost || 0), lineWidth - labelWidth - 1)}`;
      const laborLine = `${padRight('Labor', labelWidth)} ${padLeft('Rs. ' + num(bill.laborCost || bill.labor_cost || 0), lineWidth - labelWidth - 1)}`;
      const taxLine = `${padRight('Tax', labelWidth)} ${padLeft('Rs. ' + num(bill.tax || bill.tax_amount || 0), lineWidth - labelWidth - 1)}`;
      const totalLine = `${padRight('TOTAL', labelWidth)} ${padLeft('Rs. ' + num(bill.totalAmount || bill.total || bill.total_amount || 0), lineWidth - labelWidth - 1)}`;

      const receiptLines = [];
      receiptLines.push('      Teknicity Service Center');
      receiptLines.push('          Customer Bill');
      receiptLines.push('-'.repeat(lineWidth));
      receiptLines.push(`Bill ID: ${esc(bill.id || bill.ticketId || bill.ticket_id || '')}`);
      receiptLines.push(`Ticket ID: ${esc(bill.pass || bill.ticket_id || bill.repairId || '')}`);
      receiptLines.push(`Date: ${formattedDate}`);
      receiptLines.push(`Customer: ${esc(bill.customerName || '')}`);
      receiptLines.push(`Device: ${esc(bill.device || '')}`);
      receiptLines.push(`Issue: ${esc(bill.issue || '')}`);
      receiptLines.push('-'.repeat(lineWidth));
      receiptLines.push(padRight('Item', labelWidth) + ' ' + padLeft('Amount', lineWidth - labelWidth - 1));
      receiptLines.push('-'.repeat(lineWidth));
      receiptLines.push(partsLine);
      receiptLines.push(laborLine);
      receiptLines.push(taxLine);
      receiptLines.push('-'.repeat(lineWidth));
      receiptLines.push(totalLine);
      receiptLines.push('-'.repeat(lineWidth));
      receiptLines.push('Thank you for your business!');

      const text = receiptLines.join('\n');

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>
        body { margin:0; padding:6mm; font-family: monospace; }
        .receipt { width:80mm; }
        pre { font-family: monospace; font-size:10px; line-height:1.1; white-space: pre-wrap; }
        @media print { @page { size: 80mm auto; margin: 0mm; } body { margin:2mm; } }
      </style></head><body><div class="receipt"><pre>${esc(text)}</pre></div></body></html>`;

      const w = window.open('', '_blank');
      if (!w) { alert('Please allow popups to print the bill.'); return; }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.onload = () => { try { w.focus(); w.print(); } catch (e) { } };
    } catch (e) {
      console.error('Print failed', e);
      alert('Failed to open print window.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Customer Bills Management</h1>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Completed Repairs (Ready for Billing)</h2>

          {completedRepairs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Completed Repairs</h3>
              <p className="text-gray-600">Completed repairs from technicians will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Repair Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedRepairs.map((repair, idx) => (
                    <tr key={repair.id || repair.ticketId || repair.ticket_id || `repair-${idx}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{repair.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{repair.brand} {repair.model}</div>
                        {repair.imei ? <div className="text-sm text-gray-500">{repair.imei}</div> : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{repair.customerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{repair.customerPhone || (repair.raw && (repair.raw.phone_no || repair.raw.phone || repair.raw.customer_phone || repair.raw.mobile || repair.raw.msisdn || ''))}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(repair.completedAt || (repair.raw && (repair.raw.completed_date || repair.raw.completedAt || repair.raw.completedOn || repair.raw.completed_on)))}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <button
                          onClick={() => openRepairDetails(repair)}
                          aria-label={`View repair details ${repair.id}`}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-md"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openBillForm(repair)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-md transition duration-200"
                          aria-label={`Create bill for ${repair.id}`}
                        >
                          Create Bill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Bills</h2>

          <div className="mb-4 flex items-center space-x-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone or ticket id"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              Clear
            </button>
          </div>

          {bills.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🧾</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Bills Created</h3>
              <p className="text-gray-600">Bills for completed repairs will appear here.</p>
            </div>
          ) : (
            (() => {
              const q = String(searchQuery || '').trim().toLowerCase();
              const filtered = q === '' ? bills : (bills || []).filter(b => {
                const name = String(b.customerName || b.customer || b.customer_name || '').toLowerCase();
                const phone = String(b.customerPhone || b.customer_phone || b.phone || b.phone_no || '').toLowerCase();
                const ticket = String(b.pass || b.ticketId || b.ticket_id || b.repairId || b.id || '').toLowerCase();
                return name.indexOf(q) !== -1 || phone.indexOf(q) !== -1 || ticket.indexOf(q) !== -1;
              });

              if (!filtered || filtered.length === 0) {
                return (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No bills match your search</h3>
                    <p className="text-gray-600">Try a different customer name, phone number or ticket id.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filtered.map((bill, idx) => (
                        <tr key={`bill-${bill.id || bill.ticketId || bill.ticket_id || bill.repairId || bill.pass || idx}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {bill.ticketId ? String(bill.ticketId) : (bill.id ? (Number.isFinite(Number(bill.id)) ? `BILL-${String(Number(bill.id)).padStart(4, '0')}` : String(bill.id)) : '—')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{bill.customerName}</div>
                            <div className="text-sm text-gray-500">{bill.customerPhone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {bill.pass || bill.ticket_id || bill.repairId || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {bill.device}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {(() => {
                              const disp = formatNumberDisplay(bill.totalAmount || bill.total || '');
                              return disp === '' ? '—' : `Rs. ${disp}`;
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bill.status === 'Paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-3">
                              <select
                                value={bill.status || 'Pending Payment'}
                                onChange={(e) => updateBillStatus(bill.id, e.target.value)}
                                className="border rounded px-2 py-1 text-sm"
                              >
                                <option>Pending Payment</option>
                                <option>Paid</option>
                                <option>Refunded</option>
                              </select>
                              <button
                                onClick={() => printBill(bill)}
                                title="Print Bill"
                                className="text-blue-600 hover:text-blue-900 text-sm"
                              >
                                Print
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </div>

        {showBillForm && selectedRepair && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-4 z-50 overflow-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Create Bill</h2>
                  <button
                    onClick={() => setShowBillForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={createBill} className="flex flex-col">
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="mb-2">
                      <div className="text-xs text-gray-500">Ticket ID</div>
                      <div className="text-lg font-medium text-gray-900">{selectedRepair.id}</div>
                    </div>
                    <p className="text-sm font-medium text-gray-700">Device: {selectedRepair.brand} {selectedRepair.model}</p>
                    <p className="text-sm text-gray-600">Customer: {selectedRepair.customerName} ({selectedRepair.customerPhone})</p>
                    <p className="text-sm text-gray-600">Issue: {selectedRepair.issue}</p>
                  </div>

                  <div className="space-y-4 overflow-y-auto max-h-[62vh]">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parts Cost</label>
                      <input
                        type="text"
                        name="partsCost"
                        value={editingField === 'partsCost' ? (newBill.partsCost === '' ? '' : String(newBill.partsCost)) : formatNumberDisplay(newBill.partsCost)}
                        onChange={handleBillChange}
                        onFocus={() => setEditingField('partsCost')}
                        onBlur={() => setEditingField(null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost</label>
                      <input
                        type="text"
                        name="laborCost"
                        value={editingField === 'laborCost' ? (newBill.laborCost === '' ? '' : String(newBill.laborCost)) : formatNumberDisplay(newBill.laborCost)}
                        onChange={handleBillChange}
                        onFocus={() => setEditingField('laborCost')}
                        onBlur={() => setEditingField(null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                      <input
                        type="text"
                        name="tax"
                        value={editingField === 'tax' ? (newBill.tax === '' ? '' : String(newBill.tax)) : formatNumberDisplay(newBill.tax)}
                        onChange={handleBillChange}
                        onFocus={() => setEditingField('tax')}
                        onBlur={() => setEditingField(null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                      <input
                        type="text"
                        name="total"
                        value={newBill.total === '' ? '' : formatNumberDisplay(newBill.total)}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                      <textarea
                        name="notes"
                        value={newBill.notes}
                        onChange={handleBillChange}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 sticky bottom-0 bg-white pt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowBillForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition duration-200"
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Bill & Notify Customer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showRepairDetails && selectedRepair && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-4 z-50 overflow-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Repair Details</h2>
                  <button
                    onClick={() => setShowRepairDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3 text-sm overflow-y-auto max-h-[70vh]">
                  <div>
                    <div className="text-xs text-gray-500">Ticket ID</div>
                    <div className="text-lg font-medium">{selectedRepair.id}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Device</div>
                    <div className="text-lg font-medium">{selectedRepair.brand} {selectedRepair.model}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Customer</div>
                    <div className="text-lg font-medium">{selectedRepair.customerName}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <div className="text-lg font-medium">{selectedRepair.customerPhone}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Issue</div>
                    <div className="text-sm text-gray-900">{sanitizeOverview(selectedRepair.issue)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Completed Date</div>
                    <div className="text-sm text-gray-900">{formatDate(selectedRepair.completedAt || (selectedRepair.raw && (selectedRepair.raw.completed_date || selectedRepair.raw.completedAt || selectedRepair.raw.completedOn || selectedRepair.raw.completed_on)))}</div>
                  </div>
                </div>

                <div className="mt-4 sticky bottom-0 bg-white pt-4 text-right">
                  <button onClick={() => setShowRepairDetails(false)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopOwnerBills;