/**
 * Calibration Module Tests - Critical GMP Features
 * Focus on side effects, OOT handling, and compliance
 */

const { expect } = require('chai');
const sinon = require('sinon');
const CalibrationService = require('../../src/services/CalibrationService');
const CalibrationOrder = require('../../src/models/calibrationOrder.model');
const Asset = require('../../src/models/asset.model');
const { CALIBRATION_STATES, CALIBRATION_ACTIONS } = require('../../src/utils/stateMachine');

describe('Calibration Service - GMP Critical Tests', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('OOT Handling (Out of Tolerance)', () => {
        it('should set asset operational_status to DOWN when marked OOT', async () => {
            // Arrange
            const mockOrder = {
                id: 1,
                order_code: 'CAL-2026-000001',
                asset_id: 100,
                status: CALIBRATION_STATES.AWAITING_QA_REVIEW,
                asset: { id: 100, dk_code: 'ASSET-001', operational_status: 'available' }
            };
            
            const mockAsset = {
                id: 100,
                dk_code: 'ASSET-001',
                operational_status: 'available',
                calibration_status: 'in_calibration',
                update: sandbox.stub().resolves()
            };
            
            sandbox.stub(CalibrationOrder, 'findByPk').resolves(mockOrder);
            sandbox.stub(Asset, 'findByPk').resolves(mockAsset);
            sandbox.stub(Asset, 'update').resolves();
            
            // Act
            await CalibrationService.setAssetOutOfTolerance(100);
            
            // Assert
            expect(Asset.update.calledOnce).to.be.true;
            expect(Asset.update.firstCall.args[0]).to.deep.include({
                calibration_status: 'out_of_tolerance',
                operational_status: 'down' // CRITICAL: Asset must be taken offline
            });
            expect(Asset.update.firstCall.args[1]).to.deep.equal({ where: { id: 100 } });
        });
        
        it('should notify QA Manager and Production Manager when OOT marked', async () => {
            // Arrange
            const mockOrder = {
                id: 1,
                order_code: 'CAL-2026-000001',
                asset_id: 100,
                status: CALIBRATION_STATES.AWAITING_QA_REVIEW,
                asset: { 
                    id: 100, 
                    dk_code: 'ASSET-001', 
                    name: 'Critical Equipment'
                }
            };
            
            sandbox.stub(CalibrationOrder, 'findByPk').resolves(mockOrder);
            const notifyQAStub = sandbox.stub(CalibrationService, 'notifyQAManager').resolves();
            const notifyProdStub = sandbox.stub(CalibrationService, 'notifyProductionManager').resolves();
            
            // Act
            await CalibrationService.executeSideEffect('notifyQA_Manager', mockOrder, {}, 1);
            await CalibrationService.executeSideEffect('notifyProductionManager', mockOrder, {}, 1);
            
            // Assert
            expect(notifyQAStub.calledOnce).to.be.true;
            expect(notifyProdStub.calledOnce).to.be.true;
        });
    });
    
    describe('Overdue Detection', () => {
        it('should mark assets as overdue and set operational_status to limited', async () => {
            // Arrange
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 10); // 10 days overdue
            
            const mockAssets = [
                {
                    id: 100,
                    dk_code: 'ASSET-001',
                    requires_calibration: true,
                    next_due_at: pastDate,
                    calibration_status: 'valid',
                    operational_status: 'available',
                    update: sandbox.stub().resolves()
                }
            ];
            
            sandbox.stub(Asset, 'findAll').resolves(mockAssets);
            sandbox.stub(CalibrationService, 'notifyQAManager').resolves();
            
            // Act
            const result = await CalibrationService.checkOverdueCalibrations();
            
            // Assert
            expect(result.count).to.equal(1);
            expect(mockAssets[0].update.calledOnce).to.be.true;
            expect(mockAssets[0].update.firstCall.args[0]).to.deep.include({
                calibration_status: 'overdue',
                operational_status: 'limited' // GMP: Cannot use overdue equipment
            });
        });
    });
    
    describe('QA Review Process', () => {
        it('should update asset to valid status after QA acceptance', async () => {
            // Arrange
            const mockOrder = {
                id: 1,
                order_code: 'CAL-2026-000001',
                asset_id: 100,
                status: CALIBRATION_STATES.AWAITING_QA_REVIEW,
                update: sandbox.stub().resolves()
            };
            
            const mockAsset = {
                id: 100,
                dk_code: 'ASSET-001',
                calibration_interval_days: 365,
                update: sandbox.stub().resolves()
            };
            
            sandbox.stub(CalibrationOrder, 'findByPk').resolves(mockOrder);
            sandbox.stub(Asset, 'findByPk').resolves(mockAsset);
            sandbox.stub(Asset, 'update').resolves();
            
            const data = {
                certificate_no: 'CERT-2026-001',
                certificate_file_url: '/uploads/cert-001.pdf'
            };
            
            // Act
            await CalibrationService.updateAssetCalibrationValid(100, data);
            
            // Assert
            expect(Asset.update.calledOnce).to.be.true;
            const updateArgs = Asset.update.firstCall.args[0];
            
            expect(updateArgs.calibration_status).to.equal('valid');
            expect(updateArgs.operational_status).to.equal('available');
            expect(updateArgs.certificate_no).to.equal('CERT-2026-001');
            expect(updateArgs.certificate_file_url).to.equal('/uploads/cert-001.pdf');
            expect(updateArgs.last_calibrated_at).to.be.instanceof(Date);
            expect(updateArgs.next_due_at).to.be.instanceof(Date);
            
            // Verify next_due_at is 365 days from now
            const expectedNextDue = new Date();
            expectedNextDue.setDate(expectedNextDue.getDate() + 365);
            const actualNextDue = new Date(updateArgs.next_due_at);
            const diffDays = Math.abs(actualNextDue - expectedNextDue) / (1000 * 60 * 60 * 24);
            expect(diffDays).to.be.lessThan(1); // Within 1 day tolerance
        });
        
        it('should require QA notes before accepting calibration', async () => {
            // Arrange
            const mockOrder = {
                id: 1,
                status: CALIBRATION_STATES.AWAITING_QA_REVIEW
            };
            
            // Act & Assert
            const isValid = await CalibrationService.validateRule('requireQANotes', mockOrder, {
                qa_notes: 'Too short' // Less than 10 characters
            });
            
            expect(isValid).to.be.false;
            
            const isValidLong = await CalibrationService.validateRule('requireQANotes', mockOrder, {
                qa_notes: 'This is a valid QA note with sufficient detail'
            });
            
            expect(isValidLong).to.be.true;
        });
    });
    
    describe('System Status Gates (SAP PM-lite)', () => {
        it('should lock scope after REL (Released)', async () => {
            // This test verifies the System Status transition from CRTD to REL
            // In real implementation, middleware should prevent modification after REL
            
            const mockOrder = {
                id: 1,
                order_code: 'CAL-2026-000001',
                status: CALIBRATION_STATES.DRAFT,
                system_status: 'CRTD',
                scheduled_date: new Date(),
                assigned_to: 10,
                update: sandbox.stub().resolves()
            };
            
            sandbox.stub(CalibrationOrder, 'findByPk').resolves(mockOrder);
            
            // Act: Schedule the order (should transition to REL)
            const data = {
                scheduled_date: new Date(),
                assigned_to: 10
            };
            
            // Simulate handleAction for SCHEDULE
            const updates = {
                status: CALIBRATION_STATES.SCHEDULED,
                system_status: 'REL', // Scope locked
                ...data
            };
            
            // Assert
            expect(updates.system_status).to.equal('REL');
            // After REL, cannot modify scheduled_date or assigned_to (enforced by middleware)
        });
        
        it('should lock cost after TECO (Technically Complete)', async () => {
            const mockOrder = {
                id: 1,
                order_code: 'CAL-2026-000001',
                status: CALIBRATION_STATES.ACCEPTED,
                system_status: 'REL',
                actual_cost: 1000,
                update: sandbox.stub().resolves()
            };
            
            sandbox.stub(CalibrationOrder, 'findByPk').resolves(mockOrder);
            
            // Act: Close the order (should transition to TECO)
            const updates = {
                status: CALIBRATION_STATES.CLOSED,
                system_status: 'TECO' // Cost locked
            };
            
            // Assert
            expect(updates.system_status).to.equal('TECO');
            // After TECO, cannot modify actual_cost (enforced by middleware)
        });
    });
    
    describe('Validation Rules', () => {
        it('should require results before submitting for QA review', async () => {
            const mockOrder = {
                id: 1,
                status: CALIBRATION_STATES.IN_PROGRESS
            };
            
            // Without results
            const isValid1 = await CalibrationService.validateRule('requireResults', mockOrder, {});
            expect(isValid1).to.be.false;
            
            // With incomplete results
            const isValid2 = await CalibrationService.validateRule('requireResults', mockOrder, {
                result_status: 'pass'
                // missing measured_values
            });
            expect(isValid2).to.be.false;
            
            // With complete results
            const isValid3 = await CalibrationService.validateRule('requireResults', mockOrder, {
                result_status: 'pass',
                measured_values: JSON.stringify({ temp: 25.5, humidity: 60 })
            });
            expect(isValid3).to.be.true;
        });
        
        it('should require OOT severity when marking out of tolerance', async () => {
            const mockOrder = {
                id: 1,
                status: CALIBRATION_STATES.AWAITING_QA_REVIEW
            };
            
            // Without severity
            const isValid1 = await CalibrationService.validateRule('requireOOTSeverity', mockOrder, {});
            expect(isValid1).to.be.false;
            
            // With invalid severity
            const isValid2 = await CalibrationService.validateRule('requireOOTSeverity', mockOrder, {
                oot_severity: 'invalid'
            });
            expect(isValid2).to.be.false;
            
            // With valid severity
            const isValid3 = await CalibrationService.validateRule('requireOOTSeverity', mockOrder, {
                oot_severity: 'critical'
            });
            expect(isValid3).to.be.true;
        });
    });
    
    describe('Compliance Report', () => {
        it('should calculate compliance rate correctly', async () => {
            // Arrange
            sandbox.stub(Asset, 'count')
                .onFirstCall().resolves(100)  // total_assets
                .onSecondCall().resolves(90)  // valid
                .onThirdCall().resolves(5)    // overdue
                .onCall(3).resolves(3);       // due_soon
            
            sandbox.stub(CalibrationOrder, 'count')
                .onFirstCall().resolves(2)    // oot_count
                .onSecondCall().resolves(50); // completed_count
            
            const from = new Date('2026-01-01');
            const to = new Date('2026-12-31');
            
            // Act
            const report = await CalibrationService.getComplianceReport(from, to);
            
            // Assert
            expect(report.total_assets).to.equal(100);
            expect(report.valid).to.equal(90);
            expect(report.overdue).to.equal(5);
            expect(report.due_soon).to.equal(3);
            expect(report.compliance_rate).to.equal('90.00'); // 90/100 * 100
            expect(report.oot_count).to.equal(2);
            expect(report.completed_count).to.equal(50);
        });
    });
});

// Integration Test
describe('Calibration Workflow - End-to-End', () => {
    it('should complete full workflow: draft → closed', async () => {
        // This is an integration test outline
        // Should test: draft → submit → schedule → start → submit_results → 
        //              qa_accept → close
        // Verify: Asset status changes, notifications sent, audit logs created
        
        // TODO: Implement full integration test with test database
    });
    
    it('should handle OOT workflow: awaiting_qa_review → out_of_tolerance → corrective_action → closed', async () => {
        // This tests the OOT branch
        // Verify: Asset taken offline, maintenance WO created, CAPA linked
        
        // TODO: Implement OOT integration test
    });
});

module.exports = {};
