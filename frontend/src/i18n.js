// frontend/src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        back: 'Back',
        submit: 'Submit',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        download: 'Download',
        upload: 'Upload',
        close: 'Close',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No',
        entry: 'Entry',
      },

      // Navigation
      nav: {
        dashboard: 'Dashboard',
        overtime: 'Overtime',
        leave: 'Leave',
        payslips: 'Payslips',
        profile: 'Profile',
        approval: 'Approval',
        overtimeApproval: 'Overtime Approval',
        leaveApproval: 'Leave Approval',
        userManagement: 'User Management',
        payslipManagement: 'Payslip Management',
        overtimeRecap: 'Overtime Recap',
        internalPolicy: 'Internal Policy',
        logout: 'Logout',
      },

      // Login Page
      login: {
        title: 'People Management Center',
        subtitle: 'Rhaya Group',
        username: 'Username',
        password: 'Password',
        signIn: 'Sign In',
        signingIn: 'Signing in...',
        enterUsername: 'Enter your username',
        enterPassword: 'Enter your password',
        loginFailed: 'Login failed',
        defaultCredentials: 'Default credentials:',
      },

      // Dashboard
      dashboard: {
        welcomeBack: 'Welcome back, {{name}}!',
        leaveBalance: 'Leave Balance',
        overtimeBalance: 'Overtime Balance',
        pendingRequests: 'Pending Overtime Requests',
        payslips: 'Payslips',
        annualLeaveRemaining: 'Annual leave remaining',
        hoursApproved: 'Hours approved',
        clickToView: 'Click to view',
        awaitingApproval: 'Awaiting approval',
        availableToDownload: 'Available to download',
        profileInformation: 'Profile Information',
        username: 'Username',
        email: 'Email',
        accessLevel: 'Access Level',
        status: 'Status',
        supervisor: 'Supervisor',
        subordinates: 'Subordinates',
        employees: 'employees',
        employee: 'employee',
        intern: 'Intern',
        reportsTo: 'Supervisor:',
        days: 'days',
      },

      // Access Levels
      accessLevel: {
        admin: 'Admin',
        subsidiary: 'Subsidiary',
        manager: 'Manager',
        staff: 'Staff',
        intern: 'Intern',
        unknown: 'Unknown',
      },

      // Status
      status: {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        active: 'Active',
        inactive: 'Inactive',
      },

      // Date & Time
      dateTime: {
        today: 'Today',
        yesterday: 'Yesterday',
        tomorrow: 'Tomorrow',
        thisWeek: 'This Week',
        lastWeek: 'Last Week',
        thisMonth: 'This Month',
        lastMonth: 'Last Month',
      },

      // Overtime
      overtime: {
        // Page titles
        request: 'Request Overtime',
        history: 'Overtime History',
        approval: 'Overtime Approval',
        detail: 'Overtime Detail',
        edit: 'Edit Overtime',
        
        // Request page
        submitTitle: 'Submit Overtime Request',
        submitDescription: 'Submit overtime hours within 7 days of the work date. Maximum 12 hours per day.',
        importantNotes: 'Important Notes:',
        note1: 'You can only submit overtime within 7 days of the work date',
        note2: 'Maximum 12 hours per day',
        note3: 'Overtime should typically be for weekends or holidays',
        note4: 'Cannot submit duplicate dates (check your pending/approved requests)',
        
        // Edit page
        editTitle: 'Edit Overtime Request',
        editDescription: 'Update your overtime hours. Maximum 12 hours per day.',
        editGuidelines: 'Edit Guidelines:',
        editNote1: 'You can only edit within 7 days of the work date',
        editNote2: 'Maximum 12 hours per day',
        editNote3: 'Cannot have duplicate dates',
        revisionRequested: 'Revision Requested',
        onlyPendingCanEdit: 'Only pending or revision-requested overtime can be edited',
        loadingRequest: 'Loading overtime request...',
        updating: 'Updating...',
        updateRequest: 'Update Overtime Request',
        updateSuccess: 'Overtime request updated successfully!',
        updateError: 'Failed to update overtime request',
        failedToLoad: 'Failed to load overtime request',
        
        // Detail page
        detailTitle: 'Overtime Request Details',
        backToHistory: 'Back to History',
        errorLoadingRequest: 'Error Loading Request',
        editRequest: 'Edit Request',
        employeeInformation: 'Employee Information',
        name: 'Name',
        employeeId: 'Employee ID',
        role: 'Role',
        division: 'Division',
        requestSummary: 'Request Summary',
        totalHours: 'Total Hours',
        totalDays: 'Total Days',
        estimatedAmount: 'Estimated Amount',
        workingDays: 'working days',
        beforeTax: 'before tax',
        submittedDate: 'Submitted Date',
        numberOfEntries: 'Number of Entries',
        dates: 'dates',
        approvalInformation: 'Approval Information',
        currentApprover: 'Current Approver',
        notAssigned: 'Not assigned',
        supervisor: 'Supervisor',
        divisionHead: 'Division Head',
        comment: 'Comment:',
        
        // Status labels
        pendingApproval: 'Pending Approval',
        
        // Approval page
        approvalTitle: 'Overtime Approval',
        viewManageRequests: 'Review and approve overtime requests',
        pendingRequests: 'Pending Requests',
        allRequests: 'All Requests',
        approvedRequests: 'Approved Requests',
        rejectedRequests: 'Rejected Requests',
        request: 'request',
        requests: 'requests',
        of: 'of',
        shown: 'shown',
        filter: 'Filter',
        allDivisions: 'All Divisions',
        searchEmployee: 'Search Employee',
        nameOrNip: 'Name or NIP...',
        requestDateRange: 'Request Date Range',
        overtimeDateRange: 'Overtime Date Range',
        hoursRange: 'Total Hours Range',
        minHours: 'Minimum Hours',
        maxHours: 'Maximum Hours',
        from: 'From',
        to: 'To',
        clearAll: 'Clear All',
        requestBy: 'Request by',
        submittedOn: 'Submitted on',
        employee: 'Employee',
        divisionLabel: 'Division',
        approvedBy: 'Approved by',
        rejectedBy: 'Rejected by',
        viewDetails: 'View Details',
        approve: 'Approve',
        reject: 'Reject',
        requestRevision: 'Request Revision',
        overtimeRequest: 'Overtime Request',
        noRequestsFound: 'No overtime requests',
        noRequestsForTab: 'No requests found for this tab.',
        tryAdjustingFilters: 'Try adjusting your filters.',
        confirmAction: 'Confirm Action',
        areYouSure: 'Are you sure you want to {{action}} this overtime request?',
        approveAction: 'approve',
        rejectAction: 'reject',
        revisionAction: 'request revision for',
        commentLabel: 'Comment',
        commentRequired: 'Please provide a comment',
        commentPlaceholder: 'Add your comments here...',
        cancel: 'Cancel',
        confirm: 'Confirm',
        processing: 'Processing...',
        actionSuccess: 'Action completed successfully',
        actionFailed: 'Failed to process action',
        fetchFailed: 'Failed to fetch overtime requests',
        
        // Table headers

        tableNumber: '#',
        tableDate: 'Date',
        tableHours: 'Duration (Hours)',
        tableDescription: 'Description',
        tableAction: 'Action',
        tableDay: 'Day',
        fillPreviousEntry: 'Please fill the previous entry before adding a new one',
        
        // Form fields
        selectDate: 'Select date',
        hoursPlaceholder: 'Max 12',
        descriptionPlaceholder: 'e.g., Client deployment, Bug fixing',
        addAnotherDate: 'Add Another Date',
        supportsFormatting: 'e.g., SDN_resize (output file), Admin LKMK.',
        
        // Summary
        totalSummary: 'Total Summary',
        
        // Buttons
        cancel: 'Cancel',
        submitting: 'Submitting...',
        submitRequest: 'Submit Overtime Request',
        
        // Validation messages
        atLeastOneEntry: 'At least one entry is required',
        allFieldsRequired: 'All fields are required',
        hoursBetween: 'Hours must be between 0.5 and 12',
        dateMoreThan7Days: 'Date is more than 7 days ago',
        cannotSubmitFuture: 'Cannot submit future dates',
        duplicateDates: 'Duplicate dates found. Each date must be unique.',
        
        // Success/Error
        submitSuccess: 'Overtime request submitted successfully!',
        submitError: 'Failed to submit overtime request',
        
        // Weekday warning
        weekdaySelected: 'Weekday Selected',
        weekdayWarning: 'Overtime is typically for weekends/holidays',
        verifyDate: 'Please verify this date is correct',
        
        // Common fields
        date: 'Date',
        startTime: 'Start Time',
        endTime: 'End Time',
        duration: 'Duration',
        reason: 'Reason',
        status: 'Status',
        hours: 'hours',
        days: 'days',
        
        // Submission info
        submittedOn: 'Submitted on',
        submittedBy: 'Submitted by',
        approvedBy: 'Approved by',
        approvedOn: 'Approved on',
        rejectedBy: 'Rejected by',
        rejectedOn: 'Rejected on',
        
        // History page
        viewManageRequests: 'View and manage your overtime requests',
        submitOvertimeButton: 'Submit Overtime',
        overtimeBalance: 'Overtime Balance',
        pendingHours: 'Pending Hours',
        awaitingApproval: 'Awaiting approval',
        approvedBalance: 'Approved Balance',
        readyForPayment: 'Ready for payment',
        totalPaid: 'Total Paid',
        allTimeHoursPaid: 'All-time hours paid',
        
        // Filters
        advancedFilters: 'Advanced Filters',
        showFilters: 'Show Filters',
        hideFilters: 'Hide Filters',
        requestDateRange: 'Request Date Range',
        fromDate: 'From Date',
        toDate: 'To Date',
        overtimeDateRange: 'Overtime Date Range',
        hoursRange: 'Hours Range (Total)',
        minHours: 'Min Hours',
        maxHours: 'Max Hours',
        clearFilters: 'Clear Filters',
        
        // Tabs
        allRequests: 'All Requests',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        
        // Actions
        edit: 'Edit',
        delete: 'Delete',
        deleting: 'Deleting...',
        viewDetails: 'View Details',
        deleteConfirm: 'Are you sure you want to delete this overtime request?',
        
        // Empty states
        noRequests: 'No overtime requests',
        noResultsFound: 'No results found',
        getStarted: 'Get started by submitting your first overtime request.',
        tryAdjustFilters: 'Try adjusting your filters to see more results.',
        
        // Details
        overtimeDates: 'Overtime Dates:',
        comments: 'Comments:',
        supervisor: 'Supervisor:',
        divisionHead: 'Division Head:',
        approver: 'Approver:',
        
        // Messages
        deleteSuccess: 'Overtime request deleted successfully',
        deleteError: 'Failed to delete overtime request',
        loadError: 'Failed to load data',
      },

      // Leave
      leave: {
        // Page titles
        management: 'Leave Management',
        submitManage: 'Submit and manage your leave requests',
        request: 'Request Leave',
        history: 'Leave History',
        approval: 'Leave Approval',
        
        // Balance cards
        annualQuota: 'Annual Quota',
        toilBalance: 'TOIL',
        toilFull: 'Time Off In Lieu',
        used: 'Used',
        available: 'Available',
        baseAllocation: 'Base allocation',
        annual: 'Annual',
        
        // Tabs
        submitLeave: 'Submit Leave',
        leaveHistory: 'Leave History',
        
        // Leave types
        annualLeave: 'Annual Leave',
        sickLeave: 'Sick Leave',
        maternityLeave: 'Maternity Leave',
        menstrualLeave: 'Menstrual Leave',
        marriageLeave: 'Marriage Leave',
        unpaidLeave: 'Unpaid Leave',
        
        // Form fields
        type: 'Leave Type',
        startDate: 'Start Date',
        endDate: 'End Date',
        duration: 'Duration',
        reason: 'Reason',
        attachment: 'Attachment',
        attachmentNote: 'Attachment required for sick leave >2 days',
        unpaidNote: 'Max 14 days/year, 10 consecutive days',
        selectLeaveType: 'Select Leave Type',
        selectStartDate: 'Select start date',
        selectEndDate: 'Select end date',
        writeReason: 'Write your reason for taking leave...',
        chooseFile: 'Choose file',
        noFileChosen: 'No file chosen',
        
        // Status
        status: 'Status',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        
        // Buttons
        submitRequest: 'Submit Leave Request',
        submitting: 'Submitting...',
        deleteRequest: 'Delete Request',
        
        // Filter labels
        filter: 'Filter',
        allTypes: 'All Types',
        allStatuses: 'All Statuses',
        requestDateRange: 'Request Date Range',
        leaveDateRange: 'Leave Date Range',
        from: 'From',
        to: 'To',
        clearAll: 'Clear All',
        shown: 'shown',
        of: 'of',
        
        // Messages
        submitSuccess: 'Leave request submitted successfully!',
        submitError: 'Failed to submit leave request',
        deleteConfirm: 'Are you sure you want to delete this leave request?',
        deleteSuccess: 'Leave request deleted successfully',
        deleteError: 'Failed to delete leave request',
        noRequests: 'No leave requests found',
        noRequestsTab: 'No requests found for this tab.',
        tryAdjusting: 'Try adjusting your filters.',
        
        // Request cards
        requestedOn: 'Requested on',
        leavePeriod: 'Leave period',
        rejectedBy: 'Rejected by',
        supervisorComment: 'Supervisor Comment',
        
        // Units
        days: 'days',
        day: 'day',
        
        // Approval page
        approvalTitle: 'Leave Approval',
        reviewApprove: 'Review and approve leave requests',
        pendingRequests: 'Pending Requests',
        allRequests: 'All Requests',
        approvedRequests: 'Approved Requests',
        rejectedRequests: 'Rejected Requests',
        request: 'request',
        requests: 'requests',
        allDivisions: 'All Divisions',
        searchEmployee: 'Search Employee',
        nameOrNip: 'Name or NIP...',
        approve: 'Approve',
        reject: 'Reject',
        viewDetails: 'View Details',
        employee: 'Employee',
        division: 'Division',
        requestDate: 'Request Date',
        leaveDate: 'Leave Date',
        totalDays: 'Total Days',
        approvedBy: 'Approved by',
        confirmAction: 'Confirm Action',
        areYouSureApprove: 'Are you sure you want to approve this leave request?',
        areYouSureReject: 'Are you sure you want to reject this leave request?',
        commentLabel: 'Comment',
        commentOptional: 'Optional for approval, required for rejection',
        commentPlaceholder: 'Add your comments here...',
        cancel: 'Cancel',
        confirm: 'Confirm',
        processing: 'Processing...',
        actionSuccess: 'Leave request processed successfully',
        actionFailed: 'Failed to process leave request',
        fetchFailed: 'Failed to fetch leave requests',
        commentRequired: 'Comment is required for rejection',
        unpaid: 'Unpaid',
        startDate: 'Start Date',
        endDate: 'End Date',
        viewDocument: 'View Document',
        approvedOn: 'Approved on',
        by: 'by',
        rejectedOn: 'Rejected on',
        submitted: 'Submitted',
        noPendingReview: 'No pending requests to review',
      },

      // Payslips
      payslip: {
        myPayslips: 'My Payslips',
        management: 'Payslip Management',
        month: 'Month',
        year: 'Year',
        basicSalary: 'Basic Salary',
        allowances: 'Allowances',
        deductions: 'Deductions',
        netSalary: 'Net Salary',
        download: 'Download',
      },

      // User Profile
      profile: {
        // Page
        myProfile: 'My Profile',
        viewManage: 'View and manage your personal information',
        
        // Loading & Error
        loadingProfile: 'Loading profile...',
        failedToLoad: 'Failed to load profile',
        
        // Profile Card
        noNip: 'No NIP',
        leaveBalance: 'Leave Balance',
        overtimeBalance: 'Overtime Balance',
        days: 'days',
        hours: 'hours',
        
        // Section Titles
        personalInformation: 'Personal Information',
        employmentInformation: 'Employment Information',
        benefitsInformation: 'Benefits Information',
        security: 'Security',
        
        // Personal Info Fields
        fullName: 'Full Name',
        email: 'Email',
        gender: 'Gender',
        dateOfBirth: 'Date of Birth',
        placeOfBirth: 'Place of Birth',
        phone: 'Phone',
        address: 'Address',
        notSpecified: 'Not Specified',
        
        // Employment Info Fields
        employeeId: 'Employee ID',
        status: 'Status',
        division: 'Division',
        role: 'Role',
        plottingCompany: 'Plotting Company',
        joinDate: 'Join Date',
        contractStart: 'Contract Start',
        contractEnd: 'Contract End',
        supervisor: 'Supervisor',
        
        // Benefits Fields
        bpjsHealth: 'BPJS Health',
        bpjsEmployment: 'BPJS Employment',
        overtimeRate: 'Overtime Rate',
        
        // Buttons
        editProfile: 'Edit Profile',
        saveChanges: 'Save Changes',
        cancel: 'Cancel',
        changePassword: 'Change Password',
        updatePassword: 'Update Password',
        
        // Password Fields
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmNewPassword: 'Confirm New Password',
        lastPasswordChange: 'Last password change',
        never: 'Never',
        
        // Messages
        profileUpdated: 'Profile updated successfully',
        failedToUpdate: 'Failed to update profile',
        passwordsDoNotMatch: 'New passwords do not match',
        passwordTooShort: 'Password must be at least 6 characters',
        passwordChanged: 'Password changed successfully',
        failedToChangePassword: 'Failed to change password',
        failedToLoadProfile: 'Failed to load profile',
      },

      // User Management
      userManagement: {
        title: 'User Management',
        addUser: 'Add User',
        editUser: 'Edit User',
        deleteUser: 'Delete User',
        searchUsers: 'Search users...',
        totalUsers: 'Total Users',
        activeUsers: 'Active Users',
        inactiveUsers: 'Inactive Users',
      },

      // Language
      language: {
        english: 'English',
        indonesian: 'Indonesian',
        changeLanguage: 'Change Language',
      },
    },
  },
  id: {
    translation: {
      // Common
      common: {
        loading: 'Memuat...',
        error: 'Kesalahan',
        success: 'Berhasil',
        save: 'Simpan',
        cancel: 'Batal',
        delete: 'Hapus',
        edit: 'Ubah',
        view: 'Lihat',
        back: 'Kembali',
        submit: 'Kirim',
        search: 'Cari',
        filter: 'Filter',
        export: 'Ekspor',
        import: 'Impor',
        download: 'Unduh',
        upload: 'Unggah',
        close: 'Tutup',
        confirm: 'Konfirmasi',
        yes: 'Ya',
        no: 'Tidak',
        entry: 'Entri',
      },

      // Navigation
      nav: {
        dashboard: 'Dasbor',
        overtime: 'Lembur',
        leave: 'Cuti',
        payslips: 'Slip Gaji',
        profile: 'Profil',
        approval: 'Persetujuan',
        overtimeApproval: 'Persetujuan Lembur',
        leaveApproval: 'Persetujuan Cuti',
        userManagement: 'Manajemen Pengguna',
        payslipManagement: 'Manajemen Slip Gaji',
        overtimeRecap: 'Rekap Lembur',
        internalPolicy: 'Kebijakan Internal',
        logout: 'Keluar',
      },

      // Login Page
      login: {
        title: 'People Management Center',
        subtitle: 'Rhaya Group',
        username: 'Nama Pengguna',
        password: 'Kata Sandi',
        signIn: 'Masuk',
        signingIn: 'Sedang masuk...',
        enterUsername: 'Masukkan nama pengguna Anda',
        enterPassword: 'Masukkan kata sandi Anda',
        loginFailed: 'Login gagal',
        defaultCredentials: 'Kredensial default:',
      },

      // Dashboard
      dashboard: {
        welcomeBack: 'Selamat datang kembali, {{name}}!',
        leaveBalance: 'Saldo Cuti',
        overtimeBalance: 'Saldo Lembur',
        pendingRequests: 'Permintaan Lembur Tertunda',
        payslips: 'Slip Gaji',
        annualLeaveRemaining: 'Sisa cuti tahunan',
        hoursApproved: 'Jam disetujui',
        clickToView: 'Klik untuk melihat',
        awaitingApproval: 'Menunggu persetujuan',
        availableToDownload: 'Tersedia untuk diunduh',
        profileInformation: 'Informasi Profil',
        username: 'Nama Pengguna',
        email: 'Email',
        accessLevel: 'Tingkat Akses',
        status: 'Status',
        supervisor: 'Supervisor',
        subordinates: 'Bawahan',
        employees: 'karyawan',
        employee: 'karyawan',
        intern: 'Magang',
        reportsTo: 'Supervisor:',
        days: 'hari',
      },

      // Access Levels
      accessLevel: {
        admin: 'Admin',
        subsidiary: 'Anak Perusahaan',
        manager: 'Manajer',
        staff: 'Staf',
        intern: 'Magang',
        unknown: 'Tidak Diketahui',
      },

      // Status
      status: {
        pending: 'Tertunda',
        approved: 'Disetujui',
        rejected: 'Ditolak',
        active: 'Aktif',
        inactive: 'Tidak Aktif',
      },

      // Date & Time
      dateTime: {
        today: 'Hari Ini',
        yesterday: 'Kemarin',
        tomorrow: 'Besok',
        thisWeek: 'Minggu Ini',
        lastWeek: 'Minggu Lalu',
        thisMonth: 'Bulan Ini',
        lastMonth: 'Bulan Lalu',
      },

      // Overtime
      overtime: {
        // Page titles
        request: 'Ajukan Lembur',
        history: 'Riwayat Lembur',
        approval: 'Persetujuan Lembur',
        detail: 'Detail Lembur',
        edit: 'Ubah Lembur',
        
        // Request page
        submitTitle: 'Ajukan Permintaan Lembur',
        submitDescription: 'Ajukan jam lembur dalam 7 hari sejak tanggal kerja. Maksimum 12 jam per hari.',
        importantNotes: 'Catatan Penting:',
        note1: 'Anda hanya dapat mengajukan lembur dalam 7 hari sejak tanggal kerja',
        note2: 'Maksimum 12 jam per hari',
        note3: 'Lembur biasanya untuk akhir pekan atau hari libur',
        note4: 'Tidak dapat mengajukan tanggal duplikat (periksa permintaan tertunda/disetujui Anda)',
        
        // Edit page
        editTitle: 'Ubah Permintaan Lembur',
        editDescription: 'Perbarui jam lembur Anda. Maksimum 12 jam per hari.',
        editGuidelines: 'Panduan Mengubah:',
        editNote1: 'Anda hanya dapat mengubah dalam 7 hari sejak tanggal kerja',
        editNote2: 'Maksimum 12 jam per hari',
        editNote3: 'Tidak boleh ada tanggal duplikat',
        revisionRequested: 'Revisi Diminta',
        onlyPendingCanEdit: 'Hanya lembur tertunda atau yang diminta revisi yang dapat diubah',
        loadingRequest: 'Memuat permintaan lembur...',
        updating: 'Memperbarui...',
        updateRequest: 'Perbarui Permintaan Lembur',
        updateSuccess: 'Permintaan lembur berhasil diperbarui!',
        updateError: 'Gagal memperbarui permintaan lembur',
        failedToLoad: 'Gagal memuat permintaan lembur',
        
        // Detail page
        detailTitle: 'Detail Permintaan Lembur',
        backToHistory: 'Kembali ke Riwayat',
        errorLoadingRequest: 'Kesalahan Memuat Permintaan',
        editRequest: 'Ubah Permintaan',
        employeeInformation: 'Informasi Karyawan',
        name: 'Nama',
        employeeId: 'ID Karyawan',
        role: 'Jabatan',
        division: 'Divisi',
        requestSummary: 'Ringkasan Permintaan',
        totalHours: 'Total Jam',
        totalDays: 'Total Hari',
        estimatedAmount: 'Estimasi Jumlah',
        workingDays: 'hari kerja',
        beforeTax: 'sebelum pajak',
        submittedDate: 'Tanggal Diajukan',
        numberOfEntries: 'Jumlah Entri',
        dates: 'tanggal',
        approvalInformation: 'Informasi Persetujuan',
        currentApprover: 'Pemberi Persetujuan Saat Ini',
        notAssigned: 'Belum ditugaskan',
        supervisor: 'Supervisor',
        divisionHead: 'Kepala Divisi',
        comment: 'Komentar:',
        
        // Status labels
        pendingApproval: 'Menunggu Persetujuan',
        
        // Approval page
        approvalTitle: 'Persetujuan Lembur',
        viewManageRequests: 'Tinjau dan setujui permintaan lembur',
        pendingRequests: 'Permintaan Tertunda',
        allRequests: 'Semua Permintaan',
        approvedRequests: 'Permintaan Disetujui',
        rejectedRequests: 'Permintaan Ditolak',
        request: 'permintaan',
        requests: 'permintaan',
        of: 'dari',
        shown: 'ditampilkan',
        filter: 'Filter',
        allDivisions: 'Semua Divisi',
        searchEmployee: 'Cari Karyawan',
        nameOrNip: 'Nama atau NIP...',
        requestDateRange: 'Rentang Tanggal Permintaan',
        overtimeDateRange: 'Rentang Tanggal Lembur',
        hoursRange: 'Rentang Total Jam',
        minHours: 'Jam Minimum',
        maxHours: 'Jam Maksimum',
        from: 'Dari',
        to: 'Sampai',
        clearAll: 'Hapus Semua',
        requestBy: 'Permintaan oleh',
        submittedOn: 'Diajukan pada',
        employee: 'Karyawan',
        divisionLabel: 'Divisi',
        approvedBy: 'Disetujui oleh',
        rejectedBy: 'Ditolak oleh',
        viewDetails: 'Lihat Detail',
        approve: 'Setujui',
        reject: 'Tolak',
        requestRevision: 'Minta Revisi',
        overtimeRequest: 'Permintaan Lembur',
        noRequestsFound: 'Tidak ada permintaan lembur',
        noRequestsForTab: 'Tidak ada permintaan untuk tab ini.',
        tryAdjustingFilters: 'Coba sesuaikan filter Anda.',
        confirmAction: 'Konfirmasi Tindakan',
        areYouSure: 'Apakah Anda yakin ingin {{action}} permintaan lembur ini?',
        approveAction: 'menyetujui',
        rejectAction: 'menolak',
        revisionAction: 'meminta revisi untuk',
        commentLabel: 'Komentar',
        commentRequired: 'Mohon berikan komentar',
        commentPlaceholder: 'Tambahkan komentar Anda di sini...',
        cancel: 'Batal',
        confirm: 'Konfirmasi',
        processing: 'Memproses...',
        actionSuccess: 'Tindakan berhasil diselesaikan',
        actionFailed: 'Gagal memproses tindakan',
        fetchFailed: 'Gagal mengambil permintaan lembur',
        
        // Table headers
        tableNumber: '#',
        tableDate: 'Tanggal',
        tableHours: 'Durasi (Jam)',
        tableDescription: 'Deskripsi',
        tableAction: 'Aksi',
        tableDay: 'Hari',
        fillPreviousEntry: 'Silakan isi entri sebelumnya sebelum menambahkan yang baru',
        
        // Form fields
        selectDate: 'Pilih tanggal',
        hoursPlaceholder: 'Maks 12',
        descriptionPlaceholder: 'mis., Deployment klien, Perbaikan bug',
        addAnotherDate: 'Tambah Tanggal Lain',
        supportsFormatting: 'Contoh Deskripsi: SDN_resize (output file), Admin LKMK.',
        
        // Summary
        totalSummary: 'Ringkasan Total',
        
        // Buttons
        cancel: 'Batal',
        submitting: 'Mengirim...',
        submitRequest: 'Kirim Permintaan Lembur',
        
        // Validation messages
        atLeastOneEntry: 'Setidaknya satu entri diperlukan',
        allFieldsRequired: 'Semua bidang wajib diisi',
        hoursBetween: 'Jam harus antara 0.5 dan 12',
        dateMoreThan7Days: 'Tanggal lebih dari 7 hari yang lalu',
        cannotSubmitFuture: 'Tidak dapat mengajukan tanggal masa depan',
        duplicateDates: 'Tanggal duplikat ditemukan. Setiap tanggal harus unik.',
        
        // Success/Error
        submitSuccess: 'Permintaan lembur berhasil diajukan!',
        submitError: 'Gagal mengajukan permintaan lembur',
        
        // Weekday warning
        weekdaySelected: 'Hari Kerja Dipilih',
        weekdayWarning: 'Lembur biasanya untuk akhir pekan/hari libur',
        verifyDate: 'Harap verifikasi tanggal ini benar',
        
        // Common fields
        date: 'Tanggal',
        startTime: 'Waktu Mulai',
        endTime: 'Waktu Selesai',
        duration: 'Durasi',
        reason: 'Alasan',
        status: 'Status',
        hours: 'jam',
        days: 'hari',
        
        // Submission info
        submittedOn: 'Diajukan pada',
        submittedBy: 'Diajukan oleh',
        approvedBy: 'Disetujui oleh',
        approvedOn: 'Disetujui pada',
        rejectedBy: 'Ditolak oleh',
        rejectedOn: 'Ditolak pada',
        
        // History page
        viewManageRequests: 'Lihat dan kelola permintaan lembur Anda',
        submitOvertimeButton: 'Ajukan Lembur',
        overtimeBalance: 'Saldo Lembur',
        pendingHours: 'Jam Tertunda',
        awaitingApproval: 'Menunggu persetujuan',
        approvedBalance: 'Saldo Disetujui',
        readyForPayment: 'Siap dibayar',
        totalPaid: 'Total Dibayar',
        allTimeHoursPaid: 'Total jam yang dibayar',
        
        // Filters
        advancedFilters: 'Filter Lanjutan',
        showFilters: 'Tampilkan Filter',
        hideFilters: 'Sembunyikan Filter',
        requestDateRange: 'Rentang Tanggal Permintaan',
        fromDate: 'Dari Tanggal',
        toDate: 'Sampai Tanggal',
        overtimeDateRange: 'Rentang Tanggal Lembur',
        hoursRange: 'Rentang Jam (Total)',
        minHours: 'Jam Minimum',
        maxHours: 'Jam Maksimum',
        clearFilters: 'Hapus Filter',
        
        // Tabs
        allRequests: 'Semua Permintaan',
        pending: 'Tertunda',
        approved: 'Disetujui',
        rejected: 'Ditolak',
        
        // Actions
        edit: 'Ubah',
        delete: 'Hapus',
        deleting: 'Menghapus...',
        viewDetails: 'Lihat Detail',
        deleteConfirm: 'Apakah Anda yakin ingin menghapus permintaan lembur ini?',
        
        // Empty states
        noRequests: 'Tidak ada permintaan lembur',
        noResultsFound: 'Tidak ada hasil ditemukan',
        getStarted: 'Mulai dengan mengajukan permintaan lembur pertama Anda.',
        tryAdjustFilters: 'Coba sesuaikan filter Anda untuk melihat lebih banyak hasil.',
        
        // Details
        overtimeDates: 'Tanggal Lembur:',
        comments: 'Komentar:',
        supervisor: 'Supervisor:',
        divisionHead: 'Kepala Divisi:',
        approver: 'Pemberi Persetujuan:',
        
        // Messages
        deleteSuccess: 'Permintaan lembur berhasil dihapus',
        deleteError: 'Gagal menghapus permintaan lembur',
        loadError: 'Gagal memuat data',
      },

      // Leave
      leave: {
        // Page titles
        management: 'Manajemen Cuti',
        submitManage: 'Ajukan dan kelola permintaan cuti Anda',
        request: 'Ajukan Cuti',
        history: 'Riwayat Cuti',
        approval: 'Persetujuan Cuti',
        
        // Balance cards
        annualQuota: 'Kuota Tahunan',
        toilBalance: 'TOIL',
        toilFull: 'Cuti Pengganti Lembur',
        used: 'Terpakai',
        available: 'Tersedia',
        baseAllocation: 'Alokasi dasar',
        annual: 'Tahunan',
        
        // Tabs
        submitLeave: 'Ajukan Cuti',
        leaveHistory: 'Riwayat Cuti',
        
        // Leave types
        annualLeave: 'Cuti Tahunan',
        sickLeave: 'Cuti Sakit',
        maternityLeave: 'Cuti Hamil',
        menstrualLeave: 'Cuti Haid',
        marriageLeave: 'Cuti Menikah',
        unpaidLeave: 'Cuti Tidak Berbayar',
        
        // Form fields
        type: 'Jenis Cuti',
        startDate: 'Tanggal Mulai',
        endDate: 'Tanggal Selesai',
        duration: 'Durasi',
        reason: 'Alasan',
        attachment: 'Lampiran',
        attachmentNote: 'Lampiran diperlukan untuk cuti sakit >2 hari',
        unpaidNote: 'Maks 14 hari/tahun, 10 hari berturut-turut',
        selectLeaveType: 'Pilih Jenis Cuti',
        selectStartDate: 'Pilih tanggal mulai',
        selectEndDate: 'Pilih tanggal selesai',
        writeReason: 'Tulis alasan Anda mengambil cuti...',
        chooseFile: 'Pilih file',
        noFileChosen: 'Tidak ada file dipilih',
        
        // Status
        status: 'Status',
        pending: 'Tertunda',
        approved: 'Disetujui',
        rejected: 'Ditolak',
        
        // Buttons
        submitRequest: 'Ajukan Permintaan Cuti',
        submitting: 'Mengajukan...',
        deleteRequest: 'Hapus Permintaan',
        
        // Filter labels
        filter: 'Filter',
        allTypes: 'Semua Jenis',
        allStatuses: 'Semua Status',
        requestDateRange: 'Rentang Tanggal Permintaan',
        leaveDateRange: 'Rentang Tanggal Cuti',
        from: 'Dari',
        to: 'Sampai',
        clearAll: 'Hapus Semua',
        shown: 'ditampilkan',
        of: 'dari',
        
        // Messages
        submitSuccess: 'Permintaan cuti berhasil diajukan!',
        submitError: 'Gagal mengajukan permintaan cuti',
        deleteConfirm: 'Apakah Anda yakin ingin menghapus permintaan cuti ini?',
        deleteSuccess: 'Permintaan cuti berhasil dihapus',
        deleteError: 'Gagal menghapus permintaan cuti',
        noRequests: 'Tidak ada permintaan cuti ditemukan',
        noRequestsTab: 'Tidak ada permintaan untuk tab ini.',
        tryAdjusting: 'Coba sesuaikan filter Anda.',
        
        // Request cards
        requestedOn: 'Diajukan pada',
        leavePeriod: 'Periode cuti',
        rejectedBy: 'Ditolak oleh',
        supervisorComment: 'Komentar Supervisor',
        
        // Units
        days: 'hari',
        day: 'hari',
        
        // Approval page
        approvalTitle: 'Persetujuan Cuti',
        reviewApprove: 'Tinjau dan setujui permintaan cuti',
        pendingRequests: 'Permintaan Tertunda',
        allRequests: 'Semua Permintaan',
        approvedRequests: 'Permintaan Disetujui',
        rejectedRequests: 'Permintaan Ditolak',
        request: 'permintaan',
        requests: 'permintaan',
        allDivisions: 'Semua Divisi',
        searchEmployee: 'Cari Karyawan',
        nameOrNip: 'Nama atau NIP...',
        approve: 'Setujui',
        reject: 'Tolak',
        viewDetails: 'Lihat Detail',
        employee: 'Karyawan',
        division: 'Divisi',
        requestDate: 'Tanggal Permintaan',
        leaveDate: 'Tanggal Cuti',
        totalDays: 'Total Hari',
        approvedBy: 'Disetujui oleh',
        confirmAction: 'Konfirmasi Tindakan',
        areYouSureApprove: 'Apakah Anda yakin ingin menyetujui permintaan cuti ini?',
        areYouSureReject: 'Apakah Anda yakin ingin menolak permintaan cuti ini?',
        commentLabel: 'Komentar',
        commentOptional: 'Opsional untuk persetujuan, wajib untuk penolakan',
        commentPlaceholder: 'Tambahkan komentar Anda di sini...',
        cancel: 'Batal',
        confirm: 'Konfirmasi',
        processing: 'Memproses...',
        actionSuccess: 'Permintaan cuti berhasil diproses',
        actionFailed: 'Gagal memproses permintaan cuti',
        fetchFailed: 'Gagal mengambil permintaan cuti',
        commentRequired: 'Komentar diperlukan untuk penolakan',
        unpaid: 'Tidak Dibayar',
        startDate: 'Tanggal Mulai',
        endDate: 'Tanggal Selesai',
        viewDocument: 'Lihat Dokumen',
        approvedOn: 'Disetujui pada',
        by: 'oleh',
        rejectedOn: 'Ditolak pada',
        submitted: 'Diajukan',
        noPendingReview: 'Tidak ada permintaan tertunda untuk ditinjau',
      },

      // Payslips
      payslip: {
        myPayslips: 'Slip Gaji Saya',
        management: 'Manajemen Slip Gaji',
        month: 'Bulan',
        year: 'Tahun',
        basicSalary: 'Gaji Pokok',
        allowances: 'Tunjangan',
        deductions: 'Potongan',
        netSalary: 'Gaji Bersih',
        download: 'Unduh',
      },

      // User Profile
      profile: {
        // Page
        myProfile: 'Profil Saya',
        viewManage: 'Lihat dan kelola informasi pribadi Anda',
        
        // Loading & Error
        loadingProfile: 'Memuat profil...',
        failedToLoad: 'Gagal memuat profil',
        
        // Profile Card
        noNip: 'Tidak ada NIP',
        leaveBalance: 'Saldo Cuti',
        overtimeBalance: 'Saldo Lembur',
        days: 'hari',
        hours: 'jam',
        
        // Section Titles
        personalInformation: 'Informasi Pribadi',
        employmentInformation: 'Informasi Kepegawaian',
        benefitsInformation: 'Informasi Tunjangan',
        security: 'Keamanan',
        
        // Personal Info Fields
        fullName: 'Nama Lengkap',
        email: 'Email',
        gender: 'Jenis Kelamin',
        dateOfBirth: 'Tanggal Lahir',
        placeOfBirth: 'Tempat Lahir',
        phone: 'Telepon',
        address: 'Alamat',
        notSpecified: 'Tidak Ditentukan',
        
        // Employment Info Fields
        employeeId: 'ID Karyawan',
        status: 'Status',
        division: 'Divisi',
        role: 'Peran',
        plottingCompany: 'Perusahaan Plotting',
        joinDate: 'Tanggal Bergabung',
        contractStart: 'Mulai Kontrak',
        contractEnd: 'Akhir Kontrak',
        supervisor: 'Supervisor',
        
        // Benefits Fields
        bpjsHealth: 'BPJS Kesehatan',
        bpjsEmployment: 'BPJS Ketenagakerjaan',
        overtimeRate: 'Tarif Lembur',
        
        // Buttons
        editProfile: 'Ubah Profil',
        saveChanges: 'Simpan Perubahan',
        cancel: 'Batal',
        changePassword: 'Ubah Kata Sandi',
        updatePassword: 'Perbarui Kata Sandi',
        
        // Password Fields
        currentPassword: 'Kata Sandi Saat Ini',
        newPassword: 'Kata Sandi Baru',
        confirmNewPassword: 'Konfirmasi Kata Sandi Baru',
        lastPasswordChange: 'Perubahan kata sandi terakhir',
        never: 'Belum Pernah',
        
        // Messages
        profileUpdated: 'Profil berhasil diperbarui',
        failedToUpdate: 'Gagal memperbarui profil',
        passwordsDoNotMatch: 'Kata sandi baru tidak cocok',
        passwordTooShort: 'Kata sandi harus minimal 6 karakter',
        passwordChanged: 'Kata sandi berhasil diubah',
        failedToChangePassword: 'Gagal mengubah kata sandi',
        failedToLoadProfile: 'Gagal memuat profil',
      },

      // User Management
      userManagement: {
        title: 'Manajemen Pengguna',
        addUser: 'Tambah Pengguna',
        editUser: 'Ubah Pengguna',
        deleteUser: 'Hapus Pengguna',
        searchUsers: 'Cari pengguna...',
        totalUsers: 'Total Pengguna',
        activeUsers: 'Pengguna Aktif',
        inactiveUsers: 'Pengguna Tidak Aktif',
      },

      // Language
      language: {
        english: 'Inggris',
        indonesian: 'Indonesia',
        changeLanguage: 'Ubah Bahasa',
      },
    },
  },
};

// Get saved language from localStorage or default to 'en'
const savedLanguage = localStorage.getItem('language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;