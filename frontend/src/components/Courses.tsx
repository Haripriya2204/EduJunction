import React, { useState, useEffect } from 'react';
import { Table, Button, message, Modal, Tabs } from 'antd';
import { getCourses, selectElective, saveElectives } from '../api';
import type { TabsProps } from 'antd';

const { TabPane } = Tabs;

interface Course {
  id: number;
  code: string;
  name: string;
  credits: number;
  semester: string;
  isElective: boolean;
  category: string;
  peGroupId: number | null;
  oeGroupId: number | null;
}

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedElective, setSelectedElective] = useState<Course | null>(null);
  const [availableElectives, setAvailableElectives] = useState<Record<number, Course[]>>({});
  const [activeTab, setActiveTab] = useState('1');
  const [userId] = useState(19); // Replace with actual user ID from auth context

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await getCourses(userId);
      setCourses(response.data);
    } catch (error) {
      message.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const handleViewElectives = async (course: Course) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/electives/available/${userId}/${course.semester}`);
      const data = await response.json();
      if (data.success) {
        setAvailableElectives(data.data);
        setSelectedElective(course);
        setActiveTab('2'); // Switch to Electives tab
      }
    } catch (error) {
      message.error('Failed to fetch available electives');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectElective = async (course: Course) => {
    try {
      setLoading(true);
      await selectElective({
        userId,
        courseId: course.id,
        semester: selectedElective?.semester || '',
        peGroupId: course.peGroupId
      });
      message.success('Elective selected successfully');
      fetchCourses(); // Refresh the course list
    } catch (error) {
      message.error('Failed to select elective');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveElectives = async () => {
    try {
      setLoading(true);
      await saveElectives(userId, selectedElective?.semester || '');
      message.success('Elective selections saved successfully');
      setActiveTab('1'); // Switch back to Mandatory Courses tab
      fetchCourses(); // Refresh the course list
    } catch (error) {
      message.error('Failed to save elective selections');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Course Code',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Course Title',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Credits',
      dataIndex: 'credits',
      key: 'credits',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Course) => (
        record.isElective ? (
          <Button type="link" onClick={() => handleViewElectives(record)}>
            View
          </Button>
        ) : null
      ),
    },
  ];

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'Mandatory Courses',
      children: (
        <Table
          columns={columns}
          dataSource={courses.filter(c => !c.isElective)}
          rowKey="id"
          loading={loading}
        />
      ),
    },
    {
      key: '2',
      label: 'Electives',
      children: (
        <div>
          {Object.entries(availableElectives).map(([groupId, courses]) => (
            <div key={groupId} style={{ marginBottom: 24 }}>
              <h3>Professional Elective Group {groupId}</h3>
              <Table
                columns={[
                  {
                    title: 'Course Code',
                    dataIndex: 'code',
                    key: 'code',
                  },
                  {
                    title: 'Course Title',
                    dataIndex: 'name',
                    key: 'name',
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, record: Course) => (
                      <Button
                        type="primary"
                        onClick={() => handleSelectElective(record)}
                        disabled={record.isSelected}
                      >
                        {record.isSelected ? 'Selected' : 'Select'}
                      </Button>
                    ),
                  },
                ]}
                dataSource={courses}
                rowKey="id"
                loading={loading}
              />
            </div>
          ))}
          <Button type="primary" onClick={handleSaveElectives} style={{ marginTop: 16 }}>
            Save Selections
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </div>
  );
};

export default Courses; 