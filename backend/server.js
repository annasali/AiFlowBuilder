// server.js
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Workflow generation endpoint
app.post('/api/generate-workflow', async (req, res) => {
    try {
        const { input } = req.body;
        
        if (!input || input.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Input is required' 
            });
        }

        console.log('Generating workflow for input:', input);

        // Create the OpenAI prompt for workflow generation
        const prompt = `
You are an expert automation workflow designer. Based on the user's natural language description, generate a detailed JSON workflow that can be executed by automation platforms like n8n or Zapier.

User Request: "${input}"

Please analyze this request and generate a workflow with the following structure:

{
  "id": "workflow_[timestamp]",
  "name": "Generated Workflow",
  "description": "Brief description of what this workflow does",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger|action|condition",
      "subtype": "specific_type_like_form_submission",
      "name": "Human-readable name",
      "config": {
        // Specific configuration for this node
      },
      "position": { "x": 100, "y": 100 }
    }
  ],
  "connections": [
    {
      "source": "node_1",
      "target": "node_2",
      "label": "success|failure|condition"
    }
  ],
  "metadata": {
    "created": "ISO timestamp",
    "source": "ai_generated",
    "complexity": "simple|medium|complex"
  }
}

Available node types and subtypes:

TRIGGERS:
- form_submission: For form-based triggers (Jotform, Typeform, Google Forms)
- webhook: For HTTP webhook triggers
- schedule: For time-based triggers
- crm_update: For CRM system updates (Salesforce, HubSpot)
- email_received: For email-based triggers

ACTIONS:
- send_whatsapp: Send WhatsApp messages
- send_email: Send email notifications
- send_sms: Send SMS messages
- create_record: Create records in databases/CRMs
- api_call: Make API calls to external services
- create_calendar: Create calendar events
- update_spreadsheet: Update Google Sheets/Excel
- send_slack: Send Slack messages

CONDITIONS:
- if_condition: Conditional logic
- filter: Filter data based on criteria
- delay: Add delays between actions

Rules:
1. Always start with a trigger node
2. Use appropriate subtypes based on the user's request
3. Include realistic configuration values
4. Create logical connections between nodes
5. If multiple actions are mentioned, create separate action nodes
6. Include conditions when the user mentions "if", "when", or conditional logic
7. Make node names descriptive and user-friendly
8. Set realistic positions for visual layout

Respond with ONLY the JSON workflow object, no additional text or explanation.
`;

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [
                {
                    role: "system",
                    content: "You are a workflow automation expert. Generate valid JSON workflows based on user descriptions."
                },
                {
                    role: "user", 
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000,
        });

        let workflowData;
        try {
            // Parse the OpenAI response
            const responseText = completion.choices[0].message.content.trim();
            console.log('OpenAI Response:', responseText);
            
            // Try to extract JSON if it's wrapped in code blocks
            let jsonText = responseText;
            if (responseText.includes('```json')) {
                jsonText = responseText.match(/```json\n([\s\S]*?)\n```/)?.[1] || responseText;
            } else if (responseText.includes('```')) {
                jsonText = responseText.match(/```\n([\s\S]*?)\n```/)?.[1] || responseText;
            }
            
            workflowData = JSON.parse(jsonText);
            
            // Validate the workflow structure
            if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
                throw new Error('Invalid workflow structure: missing nodes array');
            }
            
            // Add timestamps and IDs if missing
            if (!workflowData.id) {
                workflowData.id = `workflow_${Date.now()}`;
            }
            
            if (!workflowData.metadata) {
                workflowData.metadata = {};
            }
            
            workflowData.metadata.created = new Date().toISOString();
            workflowData.metadata.source = 'ai_generated';
            
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            console.error('Raw response:', completion.choices[0].message.content);
            
            // Fallback: generate a simple workflow based on pattern matching
            workflowData = generateFallbackWorkflow(input);
        }

        res.json({ 
            success: true, 
            workflow: workflowData,
            model_used: "gpt-4.1"
        });

    } catch (error) {
        console.error('Error generating workflow:', error);
        
        if (error.code === 'insufficient_quota') {
            return res.status(429).json({
                error: 'OpenAI API quota exceeded. Please check your billing.',
                fallback: generateFallbackWorkflow(req.body.input)
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to generate workflow: ' + error.message,
            fallback: generateFallbackWorkflow(req.body.input)
        });
    }
});

// Test workflow endpoint
app.post('/api/test-workflow', async (req, res) => {
    try {
        const { workflow } = req.body;
        
        if (!workflow || !workflow.nodes) {
            return res.status(400).json({ 
                error: 'Valid workflow is required' 
            });
        }

        console.log('Testing workflow:', workflow.name);

        // Simulate workflow execution
        const results = {
            success: true,
            nodesExecuted: workflow.nodes.length,
            executionTime: `${(Math.random() * 2 + 0.5).toFixed(1)}s`,
            nodeResults: workflow.nodes.map(node => ({
                nodeId: node.id,
                nodeName: node.name,
                status: 'success',
                output: generateNodeOutput(node),
                executionTime: `${(Math.random() * 0.5 + 0.1).toFixed(2)}s`
            }))
        };

        res.json({ 
            success: true, 
            results 
        });

    } catch (error) {
        console.error('Error testing workflow:', error);
        res.status(500).json({ 
            error: 'Failed to test workflow: ' + error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        openai_configured: !!process.env.OPENAI_API_KEY 
    });
});

// Fallback workflow generator (when OpenAI fails)
function generateFallbackWorkflow(input) {
    console.log('Generating fallback workflow for:', input);
    
    const workflow = {
        id: `workflow_${Date.now()}`,
        name: 'Generated Workflow (Fallback)',
        description: `Automated workflow based on: ${input.substring(0, 100)}...`,
        nodes: [],
        connections: [],
        metadata: {
            created: new Date().toISOString(),
            source: 'fallback_generator',
            complexity: 'simple'
        }
    };

    let nodeId = 1;
    let yPosition = 100;

    // Simple pattern matching for triggers
    if (/form|jotform|typeform|survey/i.test(input)) {
        workflow.nodes.push({
            id: `node_${nodeId++}`,
            type: 'trigger',
            subtype: 'form_submission',
            name: 'Form Submission Trigger',
            config: {
                form_service: input.match(/jotform/i) ? 'jotform' : 'generic',
                webhook_url: 'https://your-app.com/webhook',
                fields: ['name', 'email', 'message']
            },
            position: { x: 100, y: yPosition }
        });
        yPosition += 150;
    } else if (/schedule|daily|weekly|time/i.test(input)) {
        workflow.nodes.push({
            id: `node_${nodeId++}`,
            type: 'trigger',
            subtype: 'schedule',
            name: 'Scheduled Trigger',
            config: {
                frequency: input.match(/daily/i) ? 'daily' : 'weekly',
                time: '09:00',
                timezone: 'UTC'
            },
            position: { x: 100, y: yPosition }
        });
        yPosition += 150;
    } else if (/crm|salesforce|hubspot/i.test(input)) {
        workflow.nodes.push({
            id: `node_${nodeId++}`,
            type: 'trigger',
            subtype: 'crm_update',
            name: 'CRM Update Trigger',
            config: {
                crm_system: input.match(/salesforce/i) ? 'salesforce' : 'hubspot',
                object_type: 'lead',
                trigger_field: 'status'
            },
            position: { x: 100, y: yPosition }
        });
        yPosition += 150;
    } else {
        workflow.nodes.push({
            id: `node_${nodeId++}`,
            type: 'trigger',
            subtype: 'webhook',
            name: 'Webhook Trigger',
            config: {
                method: 'POST',
                authentication: 'none',
                webhook_url: 'https://your-app.com/webhook'
            },
            position: { x: 100, y: yPosition }
        });
        yPosition += 150;
    }

    const lastNodeId = workflow.nodes[workflow.nodes.length - 1].id;

    // Add conditions if needed
    if (/if|when|condition|status.*qualified/i.test(input)) {
        const conditionNode = {
            id: `node_${nodeId++}`,
            type: 'condition',
            subtype: 'if_condition',
            name: 'Check Condition',
            config: {
                field: 'status',
                operator: 'equals',
                value: 'qualified'
            },
            position: { x: 100, y: yPosition }
        };
        workflow.nodes.push(conditionNode);
        workflow.connections.push({
            source: lastNodeId,
            target: conditionNode.id,
            label: 'trigger'
        });
        yPosition += 150;
    }

    const currentLastNode = workflow.nodes[workflow.nodes.length - 1];

    // Add actions based on input
    if (/whatsapp/i.test(input)) {
        const whatsappNode = {
            id: `node_${nodeId++}`,
            type: 'action',
            subtype: 'send_whatsapp',
            name: 'Send WhatsApp Message',
            config: {
                recipient: '+1234567890',
                message: 'New form submission received!',
                template_id: 'notification_template'
            },
            position: { x: 100, y: yPosition }
        };
        workflow.nodes.push(whatsappNode);
        workflow.connections.push({
            source: currentLastNode.id,
            target: whatsappNode.id,
            label: 'success'
        });
        yPosition += 150;
    }

    if (/email/i.test(input)) {
        const emailNode = {
            id: `node_${nodeId++}`,
            type: 'action',
            subtype: 'send_email',
            name: 'Send Email Notification',
            config: {
                to: input.match(/admin/i) ? 'admin@company.com' : 'user@example.com',
                subject: 'Workflow Notification',
                body: 'A workflow event has been triggered.',
                from: 'notifications@company.com'
            },
            position: { x: workflow.nodes.some(n => n.subtype === 'send_whatsapp') ? 300 : 100, y: yPosition - (workflow.nodes.some(n => n.subtype === 'send_whatsapp') ? 150 : 0) }
        };
        workflow.nodes.push(emailNode);
        workflow.connections.push({
            source: currentLastNode.id,
            target: emailNode.id,
            label: 'success'
        });
    }

    if (/sms|text/i.test(input)) {
        const smsNode = {
            id: `node_${nodeId++}`,
            type: 'action',
            subtype: 'send_sms',
            name: 'Send SMS',
            config: {
                to: '+1234567890',
                message: 'Notification: Workflow triggered',
                provider: 'twilio'
            },
            position: { x: 100, y: yPosition }
        };
        workflow.nodes.push(smsNode);
        workflow.connections.push({
            source: currentLastNode.id,
            target: smsNode.id,
            label: 'success'
        });
    }

    if (/calendar|meeting|appointment/i.test(input)) {
        const calendarNode = {
            id: `node_${nodeId++}`,
            type: 'action',
            subtype: 'create_calendar',
            name: 'Create Calendar Event',
            config: {
                title: 'New Meeting',
                start_time: '{{trigger.preferred_time}}',
                duration: 30,
                attendees: ['{{trigger.email}}'],
                calendar_id: 'primary'
            },
            position: { x: 100, y: yPosition }
        };
        workflow.nodes.push(calendarNode);
        workflow.connections.push({
            source: currentLastNode.id,
            target: calendarNode.id,
            label: 'success'
        });
    }

    return workflow;
}

// Generate mock output for workflow testing
function generateNodeOutput(node) {
    const outputs = {
        trigger: {
            form_submission: 'Form data received successfully',
            webhook: 'Webhook triggered with payload',
            schedule: 'Scheduled trigger activated',
            crm_update: 'CRM record updated detected',
            email_received: 'New email processed'
        },
        action: {
            send_whatsapp: 'WhatsApp message sent successfully',
            send_email: 'Email sent to recipient(s)',
            send_sms: 'SMS message delivered',
            create_record: 'New record created in database',
            api_call: 'API call completed successfully',
            create_calendar: 'Calendar event created',
            update_spreadsheet: 'Spreadsheet updated',
            send_slack: 'Slack message posted'
        },
        condition: {
            if_condition: 'Condition evaluated: true',
            filter: 'Data filtered successfully',
            delay: 'Delay completed'
        }
    };

    return outputs[node.type]?.[node.subtype] || 'Node executed successfully';
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI Flow Builder Backend running on port ${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔑 OpenAI API Key configured: ${!!process.env.OPENAI_API_KEY}`);
    
    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  WARNING: OPENAI_API_KEY not found in environment variables');
        console.warn('   The application will use fallback workflow generation');
    }
});