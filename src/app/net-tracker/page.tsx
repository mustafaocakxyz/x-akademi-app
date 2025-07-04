'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

interface Profile {
  id: string
  name: string
  role: string
  student_type: string
}

interface DenemeSection {
  id: string
  name: string
}

interface DenemeSubject {
  id: string
  name: string
  section_id: string
  question_count: number
}

interface DenemeResult {
  id: string
  student_id: string
  deneme_type_id: string
  subject_id: string
  dogru: number
  yanlis: number
  bos: number
  deneme_date: string
}

interface DenemeRow {
  id: string
  date: string
  results: { [subjectId: string]: { dogru: number; yanlis: number; bos: number } }
}

interface DenemeType {
  id: string
  name: string
}

export default function NetTrackerPage() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get('studentId')
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sections, setSections] = useState<DenemeSection[]>([])
  const [subjects, setSubjects] = useState<DenemeSubject[]>([])
  const [denemeResults, setDenemeResults] = useState<DenemeResult[]>([])
  const [denemeTypes, setDenemeTypes] = useState<DenemeType[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [newDenemeData, setNewDenemeData] = useState<{ [subjectId: string]: { dogru: string; yanlis: string; bos: string } }>({})
  const [newDenemeDate, setNewDenemeDate] = useState('')
  const [selectedType, setSelectedType] = useState<'TYT' | 'AYT'>('TYT')
  const [editDenemeData, setEditDenemeData] = useState<{ [subjectId: string]: { dogru: string; yanlis: string; bos: string } }>({})
  const [editDenemeDate, setEditDenemeDate] = useState('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()
      
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role, student_type')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Determine target student
      let targetStudentId = user.id
      if (profileData?.role === 'coach' && studentId) {
        targetStudentId = studentId
      }

      // Fetch deneme types
      const { data: denemeTypesData } = await supabase
        .from('deneme_types')
        .select('id, name')
      setDenemeTypes(denemeTypesData || [])

      // Get all sections and subjects
      const { data: sectionsData } = await supabase
        .from('deneme_sections')
        .select('id, name')
        .order('name')
      
      const { data: subjectsData } = await supabase
        .from('deneme_subjects')
        .select('id, name, section_id, question_count')
        .order('name')

      setSections(sectionsData || [])
      setSubjects(subjectsData || [])

      // Get all deneme results for the student
      const { data: resultsData } = await supabase
        .from('deneme_results')
        .select('*')
        .eq('student_id', targetStudentId)
        .order('deneme_date', { ascending: false })

      setDenemeResults(resultsData || [])
      setLoading(false)
    }
    fetchData()
  }, [studentId])

  async function saveNewDeneme() {
    if (!profile || profile.role !== 'coach' || !studentId || !newDenemeDate || !selectedTypeId) return
    
    const supabase = createClient()
    
    // Get TYT deneme type
    const { data: denemeType } = await supabase
      .from('deneme_types')
      .select('id')
      .eq('name', 'TYT')
      .single()

    if (!denemeType) return

    // Create deneme results for each subject
    const resultsToInsert = Object.entries(newDenemeData).map(([subjectId, data]) => ({
      student_id: studentId,
      deneme_type_id: selectedTypeId,
      subject_id: subjectId,
      dogru: data.dogru === '' ? 0 : parseInt(data.dogru, 10) || 0,
      yanlis: data.yanlis === '' ? 0 : parseInt(data.yanlis, 10) || 0,
      bos: data.bos === '' ? 0 : parseInt(data.bos, 10) || 0,
      deneme_date: newDenemeDate
    }))

    const { data, error } = await supabase
      .from('deneme_results')
      .insert(resultsToInsert)
      .select()

    if (error) {
      console.error('Error saving deneme:', error)
      return
    }

    // Add new results to state
    setDenemeResults(prev => [...(data || []), ...prev])
    
    // Reset form
    setNewDenemeData({})
    setNewDenemeDate('')
    setIsAddingNew(false)
  }

  function cancelAdd() {
    setNewDenemeData({})
    setNewDenemeDate('')
    setIsAddingNew(false)
  }

  function updateNewDenemeData(subjectId: string, field: 'dogru' | 'yanlis' | 'bos', value: string) {
    setNewDenemeData(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value
      }
    }))
  }

  // Only build table rows from filteredResults
  function organizeResultsIntoRows(results: DenemeResult[]): DenemeRow[] {
    const rows: { [date: string]: DenemeRow } = {};
    results.forEach((result: DenemeResult) => {
      if (!rows[result.deneme_date]) {
        rows[result.deneme_date] = {
          id: result.deneme_date,
          date: result.deneme_date,
          results: {}
        };
      }
      rows[result.deneme_date].results[result.subject_id] = {
        dogru: result.dogru,
        yanlis: result.yanlis,
        bos: result.bos
      };
    });
    return Object.values(rows);
  }

  function getSubjectResult(row: DenemeRow, subjectId: string) {
    return row.results[subjectId] || { dogru: 0, yanlis: 0, bos: 0 }
  }

  function calculateNet(dogru: number, yanlis: number): number {
    return Math.max(0, dogru - (yanlis * 0.25))
  }

  // Get the selected deneme_type_id
  const selectedTypeId = denemeTypes.find(dt => dt.name === selectedType)?.id

  // Filter logic for selected type with student type consideration
  let typeSectionNames: string[]
  
  if (selectedType === 'TYT') {
    // TYT always shows all 4 sections in specific order
    typeSectionNames = ['Türkçe', 'Sosyal', 'Matematik', 'Fen']
  } else {
    // AYT sections depend on student type
    const studentType = profile?.student_type || 'Sayısal'
    
    switch (studentType) {
      case 'Sayısal':
        typeSectionNames = ['AYT Matematik', 'Fen Bilimleri']
        break
      case 'Eşit Ağırlık':
        typeSectionNames = ['AYT Matematik', 'Sosyal Bilimler - I']
        break
      case 'Sözel':
        typeSectionNames = ['Sosyal Bilimler - I', 'Sosyal Bilimler - II']
        break
      default:
        typeSectionNames = ['AYT Matematik', 'Fen Bilimleri'] // Default to Sayısal
    }
  }
  
  // Filter sections and maintain the desired order
  const filteredSections = typeSectionNames
    .map(sectionName => sections.find(s => s.name === sectionName))
    .filter(Boolean) as DenemeSection[]
  
  const filteredSubjects = subjects.filter(s => filteredSections.some(sec => sec.id === s.section_id))
  const filteredResults = denemeResults.filter(r => r.deneme_type_id === selectedTypeId)

  // Debug logs
  console.log('denemeTypes:', denemeTypes)
  console.log('selectedType:', selectedType)
  console.log('selectedTypeId:', selectedTypeId)
  console.log('studentType:', profile?.student_type)
  console.log('typeSectionNames:', typeSectionNames)
  console.log('filteredSections:', filteredSections)
  console.log('filteredSubjects:', filteredSubjects)
  console.log('filteredResults:', filteredResults)
  console.log('denemeResults:', denemeResults)

  // Start editing a row
  function startEditRow(row: DenemeRow) {
    setEditingRow(row.id)
    setEditDenemeDate(row.date)
    const initialData: { [subjectId: string]: { dogru: string; yanlis: string; bos: string } } = {}
    Object.entries(row.results).forEach(([subjectId, data]) => {
      initialData[subjectId] = {
        dogru: data.dogru?.toString() ?? '',
        yanlis: data.yanlis?.toString() ?? '',
        bos: data.bos?.toString() ?? '',
      }
    })
    setEditDenemeData(initialData)
  }

  function updateEditDenemeData(subjectId: string, field: 'dogru' | 'yanlis' | 'bos', value: string) {
    setEditDenemeData(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value
      }
    }))
  }

  function cancelEdit() {
    setEditingRow(null)
    setEditDenemeData({})
    setEditDenemeDate('')
  }

  async function saveEditRow(row: DenemeRow) {
    if (!profile || profile.role !== 'coach' || !studentId || !editDenemeDate) return
    const supabase = createClient()
    // Find all deneme_results for this row (date and type)
    const resultsToUpdate = filteredResults.filter(r => r.deneme_date === row.date)
    // Update each subject's result
    for (const r of resultsToUpdate) {
      const data = editDenemeData[r.subject_id] || { dogru: '', yanlis: '', bos: '' }
      await supabase
        .from('deneme_results')
        .update({
          dogru: data.dogru === '' ? 0 : parseInt(data.dogru, 10) || 0,
          yanlis: data.yanlis === '' ? 0 : parseInt(data.yanlis, 10) || 0,
          bos: data.bos === '' ? 0 : parseInt(data.bos, 10) || 0,
          deneme_date: editDenemeDate
        })
        .eq('id', r.id)
    }
    // Refetch data
    setLoading(true)
    const { data: resultsData } = await supabase
      .from('deneme_results')
      .select('*')
      .eq('student_id', studentId)
      .order('deneme_date', { ascending: false })
    setDenemeResults(resultsData || [])
    setEditingRow(null)
    setEditDenemeData({})
    setEditDenemeDate('')
    setLoading(false)
  }

  // Delete a deneme row (all results for that date and type)
  async function deleteDenemeRow(row: DenemeRow) {
    if (!profile || profile.role !== 'coach' || !studentId) return
    if (!window.confirm('Bu denemeyi silmek istediğinize emin misiniz?')) return
    const supabase = createClient()
    // Find all deneme_results for this row (date and type)
    const resultsToDelete = filteredResults.filter(r => r.deneme_date === row.date)
    for (const r of resultsToDelete) {
      await supabase
        .from('deneme_results')
        .delete()
        .eq('id', r.id)
    }
    // Refetch data
    setLoading(true)
    const { data: resultsData } = await supabase
      .from('deneme_results')
      .select('*')
      .eq('student_id', studentId)
      .order('deneme_date', { ascending: false })
    setDenemeResults(resultsData || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Kullanıcı profili bulunamadı.</div>
  }

  // For coaches without studentId, show error
  if (profile.role === 'coach' && !studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Öğrenci seçilmedi</div>
          <div className="text-blue-400">Lütfen bir öğrenci seçin.</div>
        </div>
      </div>
    )
  }

  // Use filteredResults for the current table
  const rows: DenemeRow[] = organizeResultsIntoRows(filteredResults)

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <div className="w-full max-w-7xl px-4">
        <h1 className="text-3xl font-bold text-blue-400 mb-8">Deneme Takibi</h1>
        
        {/* Tab Switcher */}
        <div className="flex gap-4 mb-6">
          <button
            className={`px-6 py-2 rounded-lg font-bold text-lg border-2 transition-colors ${selectedType === 'TYT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-900 text-blue-400 border-blue-700 hover:bg-blue-900'}`}
            onClick={() => setSelectedType('TYT')}
          >
            TYT
          </button>
          <button
            className={`px-6 py-2 rounded-lg font-bold text-lg border-2 transition-colors ${selectedType === 'AYT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-900 text-blue-400 border-blue-700 hover:bg-blue-900'}`}
            onClick={() => setSelectedType('AYT')}
          >
            AYT
          </button>
        </div>
        
        {/* Student Type Indicator for AYT */}
        {selectedType === 'AYT' && profile?.student_type && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
            <span className="text-blue-300 font-medium">Öğrenci Tipi: </span>
            <span className="text-blue-200 font-bold">{profile.student_type}</span>
            <span className="text-blue-300 ml-2">
              ({typeSectionNames.length} bölüm gösteriliyor)
            </span>
          </div>
        )}

        {/* Add New Row Button (Coach Only) */}
        {profile.role === 'coach' && (
          <div className="mb-6">
            <button
              onClick={() => setIsAddingNew(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Yeni Deneme Ekle
            </button>
          </div>
        )}

        {/* Excel-like Table */}
        <div className="bg-gray-900 rounded-xl p-6 border border-blue-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {/* Section Headers Row */}
              <tr className="border-b border-blue-700">
                <th className="text-left p-2 text-blue-300 font-bold">Deneme Tarihi</th>
                {filteredSections.map(section => (
                  <th key={section.id} className="text-center p-2 text-blue-300 font-bold" colSpan={
                    filteredSubjects.filter(s => s.section_id === section.id).length
                  }>
                    {section.name}
                  </th>
                ))}
                <th className="text-center p-2 text-blue-300 font-bold">Toplam</th>
                {profile.role === 'coach' && (
                  <th className="text-center p-2 text-blue-300 font-bold">İşlemler</th>
                )}
              </tr>
              
              {/* Subject Headers Row */}
              <tr className="border-b border-blue-700">
                <th className="text-left p-2 text-blue-400"></th>
                {filteredSections.map(section => {
                  const sectionSubjects = filteredSubjects.filter(s => s.section_id === section.id)
                  return sectionSubjects.map(subject => (
                    <th key={subject.id} className="text-center p-2 text-blue-400 font-medium">
                      {subject.name}
                    </th>
                  ))
                })}
                <th className="text-center p-2 text-blue-400 font-medium">Net</th>
                {profile.role === 'coach' && (
                  <th className="text-center p-2 text-blue-400 font-medium"></th>
                )}
              </tr>
            </thead>
            
            <tbody>
              {/* New Deneme Row (when adding) */}
              {isAddingNew && (
                <tr className="border-b border-green-700 bg-green-900/20">
                  <td className="text-left p-2">
                    <input
                      type="date"
                      value={newDenemeDate}
                      onChange={(e) => setNewDenemeDate(e.target.value)}
                      className="bg-black border border-blue-800 text-blue-200 px-2 py-1 rounded text-sm w-full"
                    />
                  </td>
                  {filteredSections.map(section => {
                    const sectionSubjects = filteredSubjects.filter(s => s.section_id === section.id)
                    return sectionSubjects.map(subject => {
                      const currentData = {
                        dogru: typeof (newDenemeData[subject.id]?.dogru) === 'string' ? newDenemeData[subject.id]?.dogru : (newDenemeData[subject.id]?.dogru ?? ''),
                        yanlis: typeof (newDenemeData[subject.id]?.yanlis) === 'string' ? newDenemeData[subject.id]?.yanlis : (newDenemeData[subject.id]?.yanlis ?? ''),
                        bos: typeof (newDenemeData[subject.id]?.bos) === 'string' ? newDenemeData[subject.id]?.bos : (newDenemeData[subject.id]?.bos ?? ''),
                      }
                      return (
                        <td key={subject.id} className="text-center p-2">
                          <div className="space-y-1">
                            <input
                              type="number"
                              min="0"
                              max={subject.question_count}
                              placeholder="D"
                              value={currentData.dogru}
                              onChange={(e) => updateNewDenemeData(subject.id, 'dogru', e.target.value)}
                              className="bg-black border border-blue-800 text-blue-200 px-1 py-1 rounded text-xs w-12 text-center"
                            />
                            <input
                              type="number"
                              min="0"
                              max={subject.question_count}
                              placeholder="Y"
                              value={currentData.yanlis}
                              onChange={(e) => updateNewDenemeData(subject.id, 'yanlis', e.target.value)}
                              className="bg-black border border-blue-800 text-blue-200 px-1 py-1 rounded text-xs w-12 text-center"
                            />
                            <input
                              type="number"
                              min="0"
                              max={subject.question_count}
                              placeholder="B"
                              value={currentData.bos}
                              onChange={(e) => updateNewDenemeData(subject.id, 'bos', e.target.value)}
                              className="bg-black border border-blue-800 text-blue-200 px-1 py-1 rounded text-xs w-12 text-center"
                            />
                          </div>
                        </td>
                      )
                    })
                  })}
                  <td className="text-center p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={saveNewDeneme}
                        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                      >
                        Kaydet
                      </button>
                      <button
                        onClick={cancelAdd}
                        className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                      >
                        İptal
                      </button>
                    </div>
                  </td>
                  {profile.role === 'coach' && (
                    <td className="text-center p-2"></td>
                  )}
                </tr>
              )}
              
              {/* Data Rows */}
              {rows.map(row => (
                editingRow === row.id ? (
                  <tr key={row.id} className="border-b border-yellow-700 bg-yellow-900/20">
                    <td className="text-left p-2">
                      <input
                        type="date"
                        value={editDenemeDate}
                        onChange={e => setEditDenemeDate(e.target.value)}
                        className="bg-black border border-blue-800 text-blue-200 px-2 py-1 rounded text-sm w-full"
                      />
                    </td>
                    {filteredSections.map(section => {
                      const sectionSubjects = filteredSubjects.filter(s => s.section_id === section.id)
                      return sectionSubjects.map(subject => {
                        const currentData = {
                          dogru: typeof (editDenemeData[subject.id]?.dogru) === 'string' ? editDenemeData[subject.id]?.dogru : (editDenemeData[subject.id]?.dogru ?? ''),
                          yanlis: typeof (editDenemeData[subject.id]?.yanlis) === 'string' ? editDenemeData[subject.id]?.yanlis : (editDenemeData[subject.id]?.yanlis ?? ''),
                          bos: typeof (editDenemeData[subject.id]?.bos) === 'string' ? editDenemeData[subject.id]?.bos : (editDenemeData[subject.id]?.bos ?? ''),
                        }
                        return (
                          <td key={subject.id} className="text-center p-2">
                            <div className="space-y-1">
                              <input
                                type="number"
                                min="0"
                                max={subject.question_count}
                                placeholder="D"
                                value={currentData.dogru}
                                onChange={e => updateEditDenemeData(subject.id, 'dogru', e.target.value)}
                                className="bg-black border border-blue-800 text-blue-200 px-1 py-1 rounded text-xs w-12 text-center"
                              />
                              <input
                                type="number"
                                min="0"
                                max={subject.question_count}
                                placeholder="Y"
                                value={currentData.yanlis}
                                onChange={e => updateEditDenemeData(subject.id, 'yanlis', e.target.value)}
                                className="bg-black border border-blue-800 text-blue-200 px-1 py-1 rounded text-xs w-12 text-center"
                              />
                              <input
                                type="number"
                                min="0"
                                max={subject.question_count}
                                placeholder="B"
                                value={currentData.bos}
                                onChange={e => updateEditDenemeData(subject.id, 'bos', e.target.value)}
                                className="bg-black border border-blue-800 text-blue-200 px-1 py-1 rounded text-xs w-12 text-center"
                              />
                            </div>
                          </td>
                        )
                      })
                    })}
                    <td className="text-center p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEditRow(row)}
                          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                        >
                          İptal
                        </button>
                      </div>
                    </td>
                    {profile.role === 'coach' && (
                      <td className="text-center p-2"></td>
                    )}
                  </tr>
                ) : (
                  <tr key={row.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="text-left p-2 text-blue-200">{row.date}</td>
                    {filteredSections.map(section => {
                      const sectionSubjects = filteredSubjects.filter(s => s.section_id === section.id)
                      return sectionSubjects.map(subject => {
                        const result = getSubjectResult(row, subject.id)
                        const net = calculateNet(result.dogru, result.yanlis)
                        return (
                          <td key={subject.id} className="text-center p-2 text-blue-200">
                            <div className="text-xs">
                              <div>D: {result.dogru}</div>
                              <div>Y: {result.yanlis}</div>
                              <div>B: {result.bos}</div>
                              <div className="font-bold text-green-400">Net: {net.toFixed(2)}</div>
                            </div>
                          </td>
                        )
                      })
                    })}
                    <td className="text-center p-2 text-green-400 font-bold">
                      {(() => {
                        const totalNet = filteredSections.reduce((total, section) => {
                          const sectionSubjects = filteredSubjects.filter(s => s.section_id === section.id)
                          return total + sectionSubjects.reduce((sectionTotal, subject) => {
                            const result = getSubjectResult(row, subject.id)
                            return sectionTotal + calculateNet(result.dogru, result.yanlis)
                          }, 0)
                        }, 0)
                        return totalNet.toFixed(2)
                      })()}
                    </td>
                    {profile.role === 'coach' && (
                      <td className="text-center p-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditRow(row)}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => deleteDenemeRow(row)}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              ))}
              
              {rows.length === 0 && (
                <tr>
                  <td colSpan={filteredSections.length + 2} className="text-center p-8 text-blue-300">
                    Henüz deneme sonucu bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 